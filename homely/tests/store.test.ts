import { describe, expect, it } from 'vitest'
import { HomeStore } from '../src/core/store'
import { HomeModel, ModelError } from '../src/core/model'
import { serializeHome } from '../src/core/export'

function wallInput() {
  return { xStart: 0, yStart: 0, xEnd: 400, yEnd: 0, thickness: 10 }
}

describe('HomeStore undo/redo', () => {
  it('add → undo restores previous state, redo reapplies it', () => {
    const store = new HomeStore()
    const model = new HomeModel(store)
    const wall = model.addWall(wallInput())
    expect(store.getHome().walls).toHaveLength(1)
    expect(store.canUndo()).toBe(true)
    expect(store.canRedo()).toBe(false)

    expect(store.undo()).toBe(true)
    const undone = store.getHome()
    expect(undone.walls).toHaveLength(0)
    expect(store.canUndo()).toBe(false)
    expect(store.canRedo()).toBe(true)

    expect(store.redo()).toBe(true)
    expect(store.getHome().walls).toEqual([wall])
    expect(store.canUndo()).toBe(true)
    expect(store.canRedo()).toBe(false)
  })

  it('undo/redo round-trip is byte-identical through the serializer', () => {
    const store = new HomeStore()
    const model = new HomeModel(store)
    model.addFurniture({
      name: 'table',
      x: 120.123456,
      y: 80.987654,
      angleDeg: 45.5,
      width: 100,
      depth: 60,
      height: 75,
      elevation: 2.5,
    })
    const exported = JSON.stringify(serializeHome(store.getHome()))
    store.undo()
    store.redo()
    expect(JSON.stringify(serializeHome(store.getHome()))).toBe(exported)
  })

  it('divergent mutation clears the redo stack', () => {
    const store = new HomeStore()
    const model = new HomeModel(store)
    model.addWall(wallInput())
    store.undo()
    expect(store.canRedo()).toBe(true)
    model.addWall({ ...wallInput(), xEnd: 500 })
    expect(store.canRedo()).toBe(false)
    expect(store.undo()).toBe(true)
    expect(store.getHome().walls).toHaveLength(0)
  })

  it('undo at bottom of stack is a no-op returning false', () => {
    const store = new HomeStore()
    expect(store.undo()).toBe(false)
    expect(store.canUndo()).toBe(false)
  })

  it('resetToEmpty clears history and the id counter', () => {
    const store = new HomeStore()
    const model = new HomeModel(store)
    model.addWall(wallInput())
    model.addWall(wallInput())
    store.resetToEmpty()
    expect(store.canUndo()).toBe(false)
    expect(store.canRedo()).toBe(false)
    const id = model.addWall(wallInput()).id
    expect(id).toBe('wall-1')
  })

  it('capabilities flags are live in exported state', () => {
    const store = new HomeStore()
    const model = new HomeModel(store)
    model.setActiveTool('wall')
    let state = store.getHome()
    expect(state.capabilities).toEqual({ canUndo: true, canRedo: false })
    store.undo()
    state = store.getHome()
    expect(state.capabilities).toEqual({ canUndo: false, canRedo: true })
  })

  it('id counter issues opaque creation-ordered ids per collection', () => {
    const store = new HomeStore()
    const model = new HomeModel(store)
    const w1 = model.addWall(wallInput()).id
    const f1 = model
      .addFurniture({ name: 'a', x: 0, y: 0, angleDeg: 0, width: 1, depth: 1, height: 1, elevation: 0 })
      .id
    const w2 = model.addWall(wallInput()).id
    expect([w1, f1, w2]).toEqual(['wall-1', 'furniture-2', 'wall-3'])
  })
})

describe('HomeModel validation', () => {
  it('rejects rooms with fewer than 3 points', () => {
    const model = new HomeModel(new HomeStore())
    expect(() => model.addRoom([[0, 0], [1, 1]])).toThrow(ModelError)
    expect(() => model.addRoom([])).toThrow(ModelError)
  })

  it('rejects non-positive wall thickness and furniture dimensions', () => {
    const model = new HomeModel(new HomeStore())
    expect(() => model.addWall({ ...wallInput(), thickness: 0 })).toThrow(ModelError)
    expect(() =>
      model.addFurniture({
        name: 'x',
        x: 0,
        y: 0,
        angleDeg: 0,
        width: -5,
        depth: 1,
        height: 1,
        elevation: 0,
      }),
    ).toThrow(ModelError)
  })

  it('update/remove on unknown ids throw with a clear message', () => {
    const model = new HomeModel(new HomeStore())
    expect(() => model.updateWall('wall-99', { thickness: 12 })).toThrow(/unknown walls id/)
    expect(() => model.removeFurniture('furniture-99')).toThrow(/unknown furniture/)
    expect(() => model.removeLevel('level-99')).toThrow(/unknown level/)
  })

  it('selection must reference existing ids; removing an object drops it from selection', () => {
    const store = new HomeStore()
    const model = new HomeModel(store)
    const wall = model.addWall(wallInput())
    expect(model.setSelection([wall.id])).toEqual([wall.id])
    expect(() => model.setSelection(['nope'])).toThrow(/unknown id/)
    model.removeWall(wall.id)
    expect(store.getHome().selection).toEqual([])
  })

  it('removeLevel nulls dangling levelRefs', () => {
    const store = new HomeStore()
    const model = new HomeModel(store)
    const level = model.addLevel({
      name: 'L0',
      elevation: 0,
      floorThickness: 10,
      height: 250,
      visible: true,
      viewable: true,
    })
    model.addWall({ ...wallInput(), levelRef: level.id })
    model.removeLevel(level.id)
    const home = store.getHome()
    expect(home.levels).toHaveLength(0)
    expect(home.walls[0]?.levelRef ?? null).toBeNull()
  })

  it('environment wallsAlpha clamps to [0,1] domain via validation error', () => {
    const model = new HomeModel(new HomeStore())
    expect(() => model.setEnvironment({ wallsAlpha: 1.5 })).toThrow(ModelError)
    expect(() => model.setEnvironment({ wallsAlpha: null })).not.toThrow()
  })

  it('a failed remove pushes no undo step and preserves redo history', () => {
    const store = new HomeStore()
    const model = new HomeModel(store)
    model.addWall(wallInput())
    store.undo()
    expect(store.canRedo()).toBe(true)
    const stateBeforeFailure = JSON.stringify(serializeHome(store.getHome()))
    expect(() => model.removeWall('wall-999')).toThrow(ModelError)
    expect(store.canRedo()).toBe(true)
    expect(JSON.stringify(serializeHome(store.getHome()))).toBe(stateBeforeFailure)
    expect(store.redo()).toBe(true)
    expect(store.getHome().walls).toHaveLength(1)
  })

  it('a failed op on a fresh store leaves capabilities untouched', () => {
    const store = new HomeStore()
    const model = new HomeModel(store)
    expect(() => model.removeWall('wall-1')).toThrow(ModelError)
    expect(store.getHome().capabilities).toEqual({ canUndo: false, canRedo: false })
  })

  it('update paths re-validate schema invariants and reject bad patches', () => {
    const store = new HomeStore()
    const model = new HomeModel(store)
    const wall = model.addWall(wallInput())
    const furniture = model.addFurniture({
      name: 'x',
      x: 0,
      y: 0,
      angleDeg: 0,
      width: 10,
      depth: 10,
      height: 10,
      elevation: 0,
    })
    const label = model.addLabel({ text: 't', x: 0, y: 0 })
    expect(() => model.updateWall(wall.id, { thickness: 0 })).toThrow(/thickness/)
    expect(() => model.updateFurniture(furniture.id, { width: -3 })).toThrow(/width/)
    expect(() =>
      model.updateRoom(model.addRoom([[0, 0], [4, 0], [4, 3]]).id, {
        points: [[NaN, 0], [1]] as unknown as Array<[number, number]>,
      }),
    ).toThrow(ModelError)
    expect(() => model.updateLabel(label.id, { x: 'boom' as unknown as number })).toThrow(/x must be/)
    // failed updates leave state + history untouched
    const snapshotBefore = JSON.stringify(serializeHome(store.getHome()))
    expect(() => model.updateWall(wall.id, { thickness: -1 })).toThrow(ModelError)
    expect(JSON.stringify(serializeHome(store.getHome()))).toBe(snapshotBefore)
  })

  it('patches cannot reassign object ids', () => {
    const store = new HomeStore()
    const model = new HomeModel(store)
    const wall = model.addWall(wallInput())
    model.updateWall(wall.id, { id: 'hacked' } as unknown as Partial<typeof wall>)
    expect(store.getHome().walls[0]?.id).toBe(wall.id)
  })
})
