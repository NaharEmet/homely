import { describe, expect, it } from 'vitest'
import { HomeModel, NEW_WALL_THICKNESS_CM } from '../src/core/model'
import { HomeStore } from '../src/core/store'
import {
  PlanEngine,
  type ClickInput,
  type DragInput,
} from '../src/plan/engine'
import {
  getMagnetizedLength,
  pointWithAngleMagnetism,
  wallPointMagnetism,
} from '../src/plan/magnetism'

function setup() {
  const store = new HomeStore()
  const model = new HomeModel(store)
  const engine = new PlanEngine(model)
  const click = (x: number, y: number, rest: Omit<ClickInput, 'x' | 'y'> = {}) =>
    engine.click({ x, y, ...rest })
  const drag = (fromX: number, fromY: number, toX: number, toY: number, rest: Partial<DragInput> = {}) =>
    engine.drag({ fromX, fromY, toX, toY, ...rest })
  return { store, model, engine, click, drag }
}

const WALL_ENDPOINT_MARGIN = 4

/** Serialized wall graph modulo ids: sorted [x1,y1,x2,y2] tuples. */
function wallGraph(store: HomeStore): Array<[number, number, number, number]> {
  return store
    .getHome()
    .walls.map((w) => {
      const a: [number, number] = [w.xStart, w.yStart]
      const b: [number, number] = [w.xEnd, w.yEnd]
      // Canonical endpoint order per wall...
      const ordered =
        a[0]! > b[0]! || (a[0] === b[0] && a[1]! > b[1]!) ? ([b, a] as const) : ([a, b] as const)
      return [...ordered[0], ...ordered[1]] as [number, number, number, number]
    })
    .sort(
      (t1, t2) =>
        t1[0]! - t2[0]! || t1[1]! - t2[1]! || t1[2]! - t2[2]! || t1[3]! - t2[3]!,
    )
}

describe('wall tool state machine', () => {
  it('chains clicked segments and commits them as ONE undo step on escape', () => {
    const { engine, click, store } = setup()
    engine.setTool('wall')
    click(0, 0)
    expect(engine.getPreview().phase).toBe('drawing')
    click(100, 0)
    click(100, 80)
    expect(engine.getPreview().pendingWalls).toHaveLength(2)

    engine.key('escape')
    expect(engine.getPreview()).toMatchObject({ phase: 'idle', pendingWalls: [], chainStart: null })
    const home = store.getHome()
    expect(home.walls).toHaveLength(2)
    expect(wallGraph(store)).toEqual([
      [0, 0, 100, 0],
      [100, 0, 100, 80],
    ])
    expect(home.selection).toHaveLength(2)
    // Single compound undo op for the whole chain session.
    expect(store.undo()).toBe(true)
    expect(store.getHome().walls).toHaveLength(0)
    expect(store.canUndo()).toBe(false)
  })

  it('double-click closes the cycle, joins exactly, and adds NO room (SH3D parity)', () => {
    const { engine, click, store } = setup()
    engine.setTool('wall')
    engine.setMagnetism(false)
    click(0, 0)
    click(100, 0)
    click(50, -80)
    click(0.5, 0.5, { dbl: true })

    const home = store.getHome()
    expect(home.walls).toHaveLength(3)
    // Final segment joined EXACTLY onto the free chain-start endpoint.
    const last = home.walls[2]!
    expect([last.xStart, last.yStart]).toEqual([50, -80])
    expect([last.xEnd, last.yEnd]).toEqual([0, 0])
    // SH3D validateDrawnWalls never creates rooms on loop close.
    expect(home.rooms).toHaveLength(0)
    expect(home.selection).toHaveLength(3)
    expect(store.undo()).toBe(true)
    expect(store.getHome().walls).toHaveLength(0)
    expect(store.getHome().rooms).toHaveLength(0)
  })

  it('a later chain starts exactly at a free endpoint of a committed wall', () => {
    const { engine, click } = setup()
    engine.setTool('wall')
    engine.setMagnetism(false)
    click(0, 0)
    click(100, 0)
    engine.key('escape')

    click(102, 0) // within PIXEL_MARGIN of the free end (100,0)
    expect(engine.getPreview().chainStart).toEqual({ x: 100, y: 0 })
  })

  it('escape with an empty chain returns to the selection tool', () => {
    const { engine, click } = setup()
    engine.setTool('wall')
    engine.key('escape')
    expect(engine.getTool()).toBe('selection')

    engine.setTool('wall')
    click(10, 10)
    engine.key('escape') // commits nothing (no segments), stays in wall tool
    expect(engine.getTool()).toBe('wall')
    expect(engine.getPreview().phase).toBe('idle')
  })

  it('switching tools mid-chain commits the drawn walls first', () => {
    const { engine, click, store } = setup()
    engine.setTool('wall')
    click(0, 0)
    click(80, 0)
    engine.setTool('selection')
    expect(store.getHome().walls).toHaveLength(1)
    expect(engine.getPreview().phase).toBe('idle')
  })
})

describe('magnetism', () => {
  it('snaps lengths to the SH3D precision ladder', () => {
    expect(getMagnetizedLength(52.6, 5)).toBe(55)
    expect(getMagnetizedLength(103.005, 1)).toBe(103)
    expect(getMagnetizedLength(7.04, 0.1)).toBe(7)
  })

  it('snaps direction to the nearest 15° ray and magnetizes the radius', () => {
    expect(pointWithAngleMagnetism({ x: 0, y: 0 }, { x: 103, y: 1 }, 1)).toEqual({ x: 103, y: 0 })
    const diag = pointWithAngleMagnetism({ x: 0, y: 0 }, { x: 70.8, y: 70.8 }, 1)
    expect(diag.x).toBeCloseTo(100 * Math.cos(Math.PI / 4), 6)
    expect(diag.y).toBeCloseTo(100 * Math.sin(Math.PI / 4), 6)
  })

  it('per-axis snaps x and y independently toward wall endpoints', () => {
    const walls = [
      { id: 'w', xStart: 0, yStart: 0, xEnd: 100, yEnd: 0 },
    ]
    // x within 4 of endpoint x=100, y within 4 of endpoint y=0 → both snap.
    expect(
      wallPointMagnetism({ x: 500, y: 500 }, { x: 101, y: 3 }, walls, {
        enabled: false,
        maxDelta: 1,
        endpointMargin: WALL_ENDPOINT_MARGIN,
      }),
    ).toEqual({ x: 100, y: 0 })
    // Beyond the margin nothing moves.
    expect(
      wallPointMagnetism({ x: 500, y: 500 }, { x: 105, y: 9 }, walls, {
        enabled: false,
        maxDelta: 1,
        endpointMargin: WALL_ENDPOINT_MARGIN,
      }),
    ).toEqual({ x: 105, y: 9 })
  })

  it('engine resolves segment ends through the magnetizer when enabled', () => {
    const { engine, click, store } = setup()
    engine.setTool('wall')
    engine.setMagnetism(true)
    click(0, 0)
    click(103, 1)
    engine.key('escape')
    expect(wallGraph(store)).toEqual([[0, 0, 103, 0]])
  })

  it('set_magnetism toggles the flag used by segment resolution', () => {
    const { engine } = setup()
    expect(engine.isMagnetismEnabled()).toBe(true)
    engine.setMagnetism(false)
    expect(engine.isMagnetismEnabled()).toBe(false)
  })
})

describe('selection interactions', () => {
  function twoWalls() {
    const s = setup()
    s.engine.setTool('wall')
    s.engine.setMagnetism(false)
    s.click(0, 0)
    s.click(100, 0)
    s.engine.key('escape')
    s.click(0, 40)
    s.click(100, 40)
    s.engine.key('escape')
    s.engine.setTool('selection')
    return s
  }

  it('click selects a wall, shift-click adds, empty click clears', () => {
    const { click, store } = twoWalls()
    click(50, 0) // midpoint of first wall
    expect(store.getHome().selection).toHaveLength(1)
    const first = store.getHome().selection[0]!

    click(50, 40, { shift: true })
    expect(store.getHome().selection).toHaveLength(2)

    click(500, 500)
    expect(store.getHome().selection).toEqual([])

    click(50, 0)
    click(50, 0, { shift: true })
    expect(store.getHome().selection).toEqual([])
    void first
  })

  it('drag-move translates the hit wall in ONE undo step', () => {
    const { drag, store } = twoWalls()
    const before = wallGraph(store)
    drag(50, 0, 60, 20)
    const after = store.getHome().walls
    expect(after).toHaveLength(2)
    const moved = after.find((w) => Math.abs(w.yStart - 20) < 1e-9)!
    expect([moved.xStart, moved.yStart, moved.xEnd, moved.yEnd]).toEqual([10, 20, 110, 20])
    expect(store.undo()).toBe(true)
    expect(wallGraph(store)).toEqual(before)
  })

  it('drag over empty space rectangle-selects walls by endpoints/midpoint', () => {
    const { drag, store } = twoWalls()
    drag(-10, -10, 120, 10)
    expect(store.getHome().selection).toHaveLength(1)
    drag(-10, -10, 120, 50)
    expect(store.getHome().selection).toHaveLength(2)
  })

  it('delete key removes the selection in one undoable op', () => {
    const s = twoWalls()
    const { click, store, engine } = s
    click(50, 0)
    engine.key('delete')
    expect(store.getHome().walls).toHaveLength(1)
    expect(store.getHome().selection).toEqual([])
    expect(store.undo()).toBe(true)
    expect(store.getHome().walls).toHaveLength(2)
  })

  it('new walls use the SH3D default thickness and height', () => {
    const s = setup()
    s.engine.setTool('wall')
    s.click(0, 0)
    s.click(100, 0)
    s.engine.key('escape')
    const wall = s.store.getHome().walls[0]!
    expect(wall.thickness).toBe(NEW_WALL_THICKNESS_CM)
    expect(wall.height).toBe(250)
  })
})

describe('equivalence-style script (mirrors scenarios/walls/create_room.yaml)', () => {
  it('same click script yields the expected wall graph modulo ids', () => {
    const { engine, click, store } = setup()
    engine.setTool('wall')
    engine.setMagnetism(false)

    const script: Array<[number, number]> = [
      [0, 0],
      [400, 0],
      [400, 300],
      [0, 300],
    ]
    for (const [x, y] of script) click(x, y)
    click(0, 0, { dbl: true })

    expect(wallGraph(store)).toEqual([
      [0, 0, 0, 300],
      [0, 0, 400, 0],
      [0, 300, 400, 300],
      [400, 0, 400, 300],
    ])
    const home = store.getHome()
    expect(home.rooms).toHaveLength(0) // SH3D parity: no auto-room on loop close
    expect(home.selection).toHaveLength(4)

    // Whole room creation is one compound undo step.
    store.undo()
    expect(store.getHome().walls).toHaveLength(0)
    expect(store.getHome().rooms).toHaveLength(0)
  })
})
