import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { HomelyCommandHandler } from '../src/automation/homely-handler'
import { HomeModel, ModelError } from '../src/core/model'
import { HomeStore } from '../src/core/store'
import { CameraDirector, type CameraPresetName } from '../src/view3d/cameras'
import { buildScene } from '../src/view3d/scene'
import { observeStore } from '../src/view3d/watch'
import { View3D } from '../src/view3d/view'

const rad = (deg: number): number => (deg * Math.PI) / 180

/** Closed 400x300 room (4 walls) + floor polygon + one box, on a raised level. */
function addRoomFixture(store: HomeStore): void {
  store.apply((draft) => {
    draft.levels.push({
      id: 'level-0',
      name: 'Level 0',
      elevation: 25,
      floorThickness: 10,
      height: 250,
      visible: true,
      viewable: true,
    })
    const segments = [
      { id: 'w-n', xStart: 0, yStart: 0, xEnd: 400, yEnd: 0 },
      { id: 'w-e', xStart: 400, yStart: 0, xEnd: 400, yEnd: 300 },
      { id: 'w-s', xStart: 400, yStart: 300, xEnd: 0, yEnd: 300 },
      { id: 'w-w', xStart: 0, yStart: 300, xEnd: 0, yEnd: 0 },
    ]
    for (const segment of segments) {
      draft.walls.push({ ...segment, thickness: 7, levelRef: 'level-0' })
    }
    draft.rooms.push({
      id: 'r-1',
      points: [
        [0, 0],
        [400, 0],
        [400, 300],
        [0, 300],
      ],
      floorVisible: true,
      levelRef: 'level-0',
    })
    draft.furniture.push({
      id: 'f-1',
      name: 'table',
      x: 100,
      y: 100,
      angleDeg: 90,
      width: 80,
      depth: 40,
      height: 75,
      elevation: 0,
      visible: true,
      levelRef: 'level-0',
    })
  })
}

function indexByName(scene: THREE.Scene): Map<string, THREE.Object3D> {
  const byName = new Map<string, THREE.Object3D>()
  scene.traverse((object) => byName.set(object.name, object))
  return byName
}

function countNamed(scene: THREE.Scene, prefix: string): number {
  let count = 0
  scene.traverse((object) => {
    if (object.name.startsWith(prefix)) count += 1
  })
  return count
}

describe('buildScene', () => {
  it('renders a 4-wall room as extruded boxes matching SH3D conventions', () => {
    const store = new HomeStore()
    addRoomFixture(store)
    const scene = buildScene(store.getHome())
    const byName = indexByName(scene)

    expect(countNamed(scene, 'wall:')).toBe(4)
    expect(byName.has('wall:w-n')).toBe(true)
    expect(byName.has('wall:w-e')).toBe(true)
    expect(byName.has('wall:w-s')).toBe(true)
    expect(byName.has('wall:w-w')).toBe(true)

    // North segment: plan (0,0)->(400,0), default height fallback.
    const north = byName.get('wall:w-n') as THREE.Mesh
    expect(north.geometry).toBeInstanceOf(THREE.BoxGeometry)
    const northBox = north.geometry as THREE.BoxGeometry
    expect(northBox.parameters.width).toBeCloseTo(400)
    expect(northBox.parameters.height).toBe(250)
    expect(northBox.parameters.depth).toBe(7)
    expect(north.position.x).toBeCloseTo(200)
    expect(north.position.y).toBeCloseTo(25 + 125)
    expect(north.position.z).toBeCloseTo(0)
    expect(north.rotation.y).toBeCloseTo(Math.atan2(0, 400))

    // East segment yaw straight from atan2(dy, dx).
    const east = byName.get('wall:w-e') as THREE.Mesh
    expect(east.rotation.y).toBeCloseTo(Math.atan2(300, 0))
    expect(east.position.z).toBeCloseTo(150)
  })

  it('renders the room floor polygon flat with an up-facing normal', () => {
    const store = new HomeStore()
    addRoomFixture(store)
    const scene = buildScene(store.getHome())
    const room = indexByName(scene).get('room:r-1') as THREE.Mesh

    expect(room.geometry).toBeInstanceOf(THREE.ShapeGeometry)
    expect(room.position.y).toBeCloseTo(25)
    const normal = room.geometry.getAttribute('normal')
    expect(normal.getX(0)).toBeCloseTo(0)
    expect(normal.getY(0)).toBeCloseTo(1)
    expect(normal.getZ(0)).toBeCloseTo(0)
    // Plan y spans 0..300 landing straight on world z (no mirroring).
    const position = room.geometry.getAttribute('position')
    const zs = Array.from({ length: position.count }, (_, i) => position.getZ(i))
    const xs = Array.from({ length: position.count }, (_, i) => position.getX(i))
    expect(Math.min(...zs)).toBeCloseTo(0)
    expect(Math.max(...zs)).toBeCloseTo(300)
    expect(Math.max(...xs)).toBeCloseTo(400)
  })

  it('renders furniture placeholder boxes with catalog dimensions', () => {
    const store = new HomeStore()
    addRoomFixture(store)
    const scene = buildScene(store.getHome())
    const table = indexByName(scene).get('furniture:f-1') as THREE.Mesh

    const box = table.geometry as THREE.BoxGeometry
    expect(box.parameters.width).toBe(80)
    expect(box.parameters.height).toBe(75)
    expect(box.parameters.depth).toBe(40)
    expect(table.position.x).toBeCloseTo(100)
    expect(table.position.y).toBeCloseTo(25 + 37.5)
    expect(table.position.z).toBeCloseTo(100)
    expect(table.rotation.y).toBeCloseTo(rad(90))
  })

  it('applies environment colors and wallsAlpha transparency', () => {
    const store = new HomeStore()
    const scene = buildScene(store.getHome())
    expect(scene.background).toEqual(new THREE.Color(0xcce4fc))
    expect(indexByName(scene).has('ground')).toBe(true)

    store.apply((draft) => {
      draft.environment.wallsAlpha = 0.5
      draft.walls.push({
        id: 'w-x',
        xStart: 0,
        yStart: 0,
        xEnd: 100,
        yEnd: 0,
        thickness: 7,
      })
    })
    const wall = indexByName(buildScene(store.getHome())).get('wall:w-x') as THREE.Mesh
    const material = wall.material as THREE.MeshLambertMaterial
    expect(material.transparent).toBe(true)
    expect(material.opacity).toBeCloseTo(0.5)
  })

  it('renders default walls opaque: wallsAlpha is transparency, 0 = solid', () => {
    const store = new HomeStore()
    expect(store.getHome().environment.wallsAlpha).toBe(0) // SH3D default
    store.apply((draft) => {
      draft.walls.push({
        id: 'w-solid',
        xStart: 0,
        yStart: 0,
        xEnd: 100,
        yEnd: 0,
        thickness: 7,
      })
    })
    const wall = indexByName(buildScene(store.getHome())).get('wall:w-solid') as THREE.Mesh
    const material = wall.material as THREE.MeshLambertMaterial
    expect(material.transparent).toBe(false)
    expect(material.opacity).toBe(1)
  })
})

describe('camera conventions', () => {
  it('maps the observer default through the SH3D transform', () => {
    const view = new View3D(new HomeStore())
    expect(view.director.getActivePreset()).toBe('observer')
    expect(view.camera.position.x).toBeCloseTo(50)
    expect(view.camera.position.y).toBeCloseTo(170) // eye height lives in z
    expect(view.camera.position.z).toBeCloseTo(50)
    expect(view.camera.rotation.order).toBe('YXZ')
    expect(view.camera.rotation.y).toBeCloseTo(Math.PI - rad(315))
    expect(view.camera.rotation.x).toBeCloseTo(-rad(11.25))
    expect(view.camera.fov).toBeCloseTo(63)
  })

  it('switches to the top preset with SH3D defaults', () => {
    const view = new View3D(new HomeStore())
    view.setActivePreset('top')
    expect(view.camera.position.x).toBeCloseTo(50)
    expect(view.camera.position.y).toBeCloseTo(1010)
    expect(view.camera.position.z).toBeCloseTo(1050)
    expect(view.camera.rotation.y).toBeCloseTo(Math.PI - rad(180)) // ~0
    expect(view.camera.rotation.x).toBeCloseTo(-rad(45))
  })

  it('director patches only the active camera through HomeModel', () => {
    const store = new HomeStore()
    const director = new CameraDirector(store, new HomeModel(store))

    director.setCamera({ x: 123, y: 77 })
    expect(store.getHome().cameras.observer.x).toBe(123)
    expect(store.getHome().cameras.observer.y).toBe(77)
    expect(store.getHome().cameras.top.x).toBeCloseTo(50)

    const top = director.usePreset('top')
    expect(top.fovDeg).toBe(63)
    director.setCamera({ x: 999 })
    expect(store.getHome().cameras.top.x).toBe(999)
    expect(store.getHome().cameras.observer.x).toBe(123)
  })

  it('rejects unknown presets with ModelError', () => {
    const store = new HomeStore()
    const director = new CameraDirector(store, new HomeModel(store))
    expect(() => director.usePreset('iso' as CameraPresetName)).toThrow(ModelError)
  })
})

describe('store watch shim', () => {
  it('notifies on apply/undo/redo/reset and not on no-op undo/redo', () => {
    const store = new HomeStore()
    const listener = vi.fn()
    const unobserve = observeStore(store, listener)

    expect(store.undo()).toBe(false)
    expect(store.redo()).toBe(false)
    expect(listener).not.toHaveBeenCalled()

    store.apply(() => undefined)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.undo()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(store.redo()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(3)
    store.resetToEmpty()
    expect(listener).toHaveBeenCalledTimes(4)

    unobserve()
    store.apply(() => undefined)
    expect(listener).toHaveBeenCalledTimes(4)
  })
})

describe('View3D live sync', () => {
  it('rebuilds the scene on store changes and keeps both presets working', () => {
    const store = new HomeStore()
    const view = new View3D(store)
    expect(countNamed(view.scene, 'wall:')).toBe(0)

    addRoomFixture(store)
    expect(countNamed(view.scene, 'wall:')).toBe(4)
    expect(countNamed(view.scene, 'room:')).toBe(1)
    expect(countNamed(view.scene, 'furniture:')).toBe(1)

    view.setActivePreset('top')
    expect(countNamed(view.scene, 'wall:')).toBe(4)
    // Top camera follows home contents (SH3D TopCameraState parity, B7):
    // fixture bounds center (200,150,137.5), distance 1414.21 preserved.
    expect(view.camera.position.y).toBeCloseTo(1137.5)
    expect(view.camera.position.x).toBeCloseTo(200)
    expect(view.camera.position.z).toBeCloseTo(1150)

    view.dispose()
  })
})

describe('automation camera commands', () => {
  it('advertises set_camera and camera_preset in get_capabilities', () => {
    const handler = new HomelyCommandHandler(new HomeStore())
    const result = handler.execute('get_capabilities', {})
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const commands = (result.data as { commands: string[] }).commands
    expect(commands).toContain('set_camera')
    expect(commands).toContain('camera_preset')
  })

  it('set_camera applies only supplied fields to the active camera', () => {
    const store = new HomeStore()
    const handler = new HomelyCommandHandler(store)

    expect(handler.execute('set_camera', { x: 123, yawDeg: 10 })).toEqual({ ok: true, data: {} })
    const observer = store.getHome().cameras.observer
    expect(observer.x).toBe(123)
    expect(observer.yawDeg).toBe(10)
    expect(observer.pitchDeg).toBeCloseTo(11.25)

    handler.execute('camera_preset', { preset: 'top' })
    expect(handler.execute('set_camera', { x: 999 })).toEqual({ ok: true, data: {} })
    expect(store.getHome().cameras.top.x).toBe(999)
    expect(store.getHome().cameras.observer.x).toBe(123)
  })

  it('camera_preset switches preset and reports the resulting camera', () => {
    const store = new HomeStore()
    const handler = new HomelyCommandHandler(store)

    const result = handler.execute('camera_preset', { preset: 'top' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const top = store.getHome().cameras.top
    expect(result.data).toEqual({
      camera: {
        x: top.x,
        y: top.y,
        z: top.z,
        yawDeg: top.yawDeg,
        pitchDeg: top.pitchDeg,
        fovDeg: top.fovDeg,
      },
    })
    // Subsequent set_camera now targets top.
    handler.execute('set_camera', { fovDeg: 70 })
    expect(store.getHome().cameras.top.fovDeg).toBe(70)
  })

  it('rejects bad params with INVALID_PARAMS', () => {
    const handler = new HomelyCommandHandler(new HomeStore())
    const badType = handler.execute('set_camera', { x: 'far' })
    expect(badType.ok).toBe(false)
    if (!badType.ok) expect(badType.code).toBe('INVALID_PARAMS')
    const nan = handler.execute('set_camera', { x: Number.NaN })
    expect(nan.ok).toBe(false)
    if (!nan.ok) expect(nan.code).toBe('INVALID_PARAMS')
    const badPreset = handler.execute('camera_preset', { preset: 'iso' })
    expect(badPreset.ok).toBe(false)
    if (!badPreset.ok) expect(badPreset.code).toBe('INVALID_PARAMS')
  })
})
