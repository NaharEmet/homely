import type {
  ActiveTool,
  CompassState,
  DimensionLine,
  EnvironmentState,
  Furniture,
  Label,
  Level,
  NormalizedHomeState,
  Room,
  Wall,
} from './home'
import { DEFAULT_WALL_HEIGHT_CM } from './home'
import type { HomeStore } from './store'

export const DEFAULT_LEVEL_HEIGHT_CM = DEFAULT_WALL_HEIGHT_CM

/** Thrown by HomeModel ops on invalid input; surfaces as INVALID_PARAMS over automation. */
export class ModelError extends Error {}

type IdLike = { id: string }
type CollectionKey = 'levels' | 'walls' | 'rooms' | 'furniture' | 'dimensionLines' | 'labels'

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ModelError(message)
}

function requirePositive(value: unknown, field: string): void {
  assert(
    typeof value === 'number' && Number.isFinite(value) && value > 0,
    `${field} must be a finite number > 0`,
  )
}

function requireFinite(value: unknown, field: string): void {
  assert(typeof value === 'number' && Number.isFinite(value), `${field} must be a finite number`)
}

/** Re-validates patches so updates can never smuggle schema-invalid state in. */
function validatePatch(key: CollectionKey, patch: Record<string, unknown>): void {
  switch (key) {
    case 'walls': {
      for (const field of ['xStart', 'yStart', 'xEnd', 'yEnd', 'height', 'heightAtEnd', 'arcExtent']) {
        if (patch[field] !== undefined) requireFinite(patch[field], field)
      }
      if (patch.thickness !== undefined) requirePositive(patch.thickness, 'thickness')
      break
    }
    case 'rooms': {
      if (patch.points !== undefined) {
        const points = patch.points
        assert(
          Array.isArray(points) && points.length >= 3,
          `room needs at least 3 points, got ${Array.isArray(points) ? points.length : typeof points}`,
        )
        for (const point of points) {
          assert(Array.isArray(point) && point.length === 2, 'room point must be [x, y]')
          requireFinite(point[0], 'point x')
          requireFinite(point[1], 'point y')
        }
      }
      break
    }
    case 'furniture': {
      for (const field of ['x', 'y', 'angleDeg', 'elevation', 'pitchDeg', 'rollDeg']) {
        if (patch[field] !== undefined) requireFinite(patch[field], field)
      }
      for (const field of ['width', 'depth', 'height']) {
        if (patch[field] !== undefined) requirePositive(patch[field], field)
      }
      if (patch.modelRotationDeg !== undefined) {
        assert(Array.isArray(patch.modelRotationDeg), 'modelRotationDeg must be an array')
        for (const entry of patch.modelRotationDeg) requireFinite(entry, 'modelRotationDeg entry')
      }
      break
    }
    case 'dimensionLines': {
      for (const field of ['xStart', 'yStart', 'xEnd', 'yEnd', 'offset', 'elevationStart', 'elevationEnd']) {
        if (patch[field] !== undefined) requireFinite(patch[field], field)
      }
      break
    }
    case 'labels': {
      for (const field of ['x', 'y', 'angleDeg', 'elevation']) {
        if (patch[field] !== undefined) requireFinite(patch[field], field)
      }
      if (patch.text !== undefined) assert(typeof patch.text === 'string', 'label text must be a string')
      break
    }
    case 'levels': {
      for (const field of ['elevation', 'floorThickness']) {
        if (patch[field] !== undefined) requireFinite(patch[field], field)
      }
      if (patch.height !== undefined) requirePositive(patch.height, 'height')
      if (patch.name !== undefined) {
        assert(typeof patch.name === 'string' && patch.name.length > 0, 'level name required')
      }
      break
    }
  }
}

/**
 * Typed domain operations over a HomeStore. Every op is one undo step.
 * Optional fields are materialized with schema defaults so exports stay
 * stable regardless of how an object was created.
 */
export class HomeModel {
  constructor(private readonly store: HomeStore) {}

  getStore(): HomeStore {
    return this.store
  }

  setName(name: string): void {
    this.store.apply((h) => {
      h.name = name
    })
  }

  addLevel(input: Omit<Level, 'id'>): Level {
    assert(typeof input.name === 'string' && input.name.length > 0, 'level name required')
    requireFinite(input.elevation, 'elevation')
    requireFinite(input.floorThickness, 'floorThickness')
    requirePositive(input.height, 'height')
    let created!: Level
    this.store.apply((h) => {
      created = { ...input, id: this.store.generateId('level') }
      h.levels.push(created)
    })
    return structuredClone(created)
  }

  removeLevel(id: string): boolean {
    const snapshot = this.store.getHome()
    assert(snapshot.levels.some((level) => level.id === id), `unknown level: ${id}`)
    this.store.apply((h) => {
      const index = h.levels.findIndex((l) => l.id === id)
      if (index >= 0) h.levels.splice(index, 1)
      // Dangling levelRefs revert to the default (null) level.
      for (const wall of h.walls) if (wall.levelRef === id) wall.levelRef = null
      for (const room of h.rooms) if (room.levelRef === id) room.levelRef = null
      for (const f of h.furniture) if (f.levelRef === id) f.levelRef = null
      for (const d of h.dimensionLines) if (d.levelRef === id) d.levelRef = null
      for (const l of h.labels) if (l.levelRef === id) l.levelRef = null
    })
    return true
  }

  addWall(input: Omit<Wall, 'id'>): Wall {
    requireFinite(input.xStart, 'xStart')
    requireFinite(input.yStart, 'yStart')
    requireFinite(input.xEnd, 'xEnd')
    requireFinite(input.yEnd, 'yEnd')
    requirePositive(input.thickness, 'thickness')
    let created!: Wall
    this.store.apply((h) => {
      created = { ...input, id: this.store.generateId('wall') }
      h.walls.push(created)
    })
    return structuredClone(created)
  }

  updateWall(id: string, patch: Partial<Omit<Wall, 'id'>>): Wall {
    return this.updateIn('walls', id, patch)
  }

  removeWall(id: string): boolean {
    return this.removeFrom('walls', id, 'wall')
  }

  addRoom(points: Array<[number, number]>, input: Partial<Omit<Room, 'id' | 'points'>> = {}): Room {
    assert(
      Array.isArray(points) && points.length >= 3,
      `room needs at least 3 points, got ${points?.length}`,
    )
    for (const [x, y] of points) {
      requireFinite(x, 'point x')
      requireFinite(y, 'point y')
    }
    let created!: Room
    this.store.apply((h) => {
      created = {
        id: this.store.generateId('room'),
        points: points.map(([x, y]) => [x, y] as [number, number]),
        name: input.name ?? null,
        areaVisible: input.areaVisible ?? true,
        floorVisible: input.floorVisible ?? true,
        floorColor: input.floorColor ?? null,
        ceilingVisible: input.ceilingVisible ?? false,
        levelRef: input.levelRef ?? null,
      }
      h.rooms.push(created)
    })
    return structuredClone(created)
  }

  updateRoom(id: string, patch: Partial<Omit<Room, 'id'>>): Room {
    return this.updateIn('rooms', id, patch)
  }

  removeRoom(id: string): boolean {
    return this.removeFrom('rooms', id, 'room')
  }

  addFurniture(input: Omit<Furniture, 'id'>): Furniture {
    assert(typeof input.name === 'string' && input.name.length > 0, 'furniture name required')
    requireFinite(input.x, 'x')
    requireFinite(input.y, 'y')
    requireFinite(input.angleDeg, 'angleDeg')
    requireFinite(input.elevation, 'elevation')
    requirePositive(input.width, 'width')
    requirePositive(input.depth, 'depth')
    requirePositive(input.height, 'height')
    let created!: Furniture
    this.store.apply((h) => {
      created = {
        catalogId: null,
        pitchDeg: 0,
        rollDeg: 0,
        color: null,
        visible: true,
        movable: true,
        doorOrWindow: false,
        modelRotationDeg: [],
        levelRef: null,
        ...input,
        id: this.store.generateId('furniture'),
      }
      h.furniture.push(created)
    })
    return structuredClone(created)
  }

  updateFurniture(id: string, patch: Partial<Omit<Furniture, 'id'>>): Furniture {
    return this.updateIn('furniture', id, patch)
  }

  removeFurniture(id: string): boolean {
    return this.removeFrom('furniture', id, 'furniture')
  }

  addDimensionLine(
    input: Pick<DimensionLine, 'xStart' | 'yStart' | 'xEnd' | 'yEnd' | 'offset'> &
      Partial<Omit<DimensionLine, 'id' | 'xStart' | 'yStart' | 'xEnd' | 'yEnd' | 'offset'>>,
  ): DimensionLine {
    requireFinite(input.xStart, 'xStart')
    requireFinite(input.yStart, 'yStart')
    requireFinite(input.xEnd, 'xEnd')
    requireFinite(input.yEnd, 'yEnd')
    requireFinite(input.offset, 'offset')
    let created!: DimensionLine
    this.store.apply((h) => {
      created = {
        elevationStart: 0,
        elevationEnd: 0,
        levelRef: null,
        ...input,
        id: this.store.generateId('dimension'),
      }
      h.dimensionLines.push(created)
    })
    return structuredClone(created)
  }

  updateDimensionLine(id: string, patch: Partial<Omit<DimensionLine, 'id'>>): DimensionLine {
    return this.updateIn('dimensionLines', id, patch)
  }

  removeDimensionLine(id: string): boolean {
    return this.removeFrom('dimensionLines', id, 'dimension line')
  }

  addLabel(input: Omit<Label, 'id'>): Label {
    assert(typeof input.text === 'string', 'label text required')
    requireFinite(input.x, 'x')
    requireFinite(input.y, 'y')
    let created!: Label
    this.store.apply((h) => {
      created = { angleDeg: 0, elevation: 0, color: null, levelRef: null, ...input, id: this.store.generateId('label') }
      h.labels.push(created)
    })
    return structuredClone(created)
  }

  updateLabel(id: string, patch: Partial<Omit<Label, 'id'>>): Label {
    return this.updateIn('labels', id, patch)
  }

  removeLabel(id: string): boolean {
    return this.removeFrom('labels', id, 'label')
  }

  setSelection(ids: string[]): string[] {
    assert(Array.isArray(ids), 'selection must be an array of ids')
    const known = new Set<string>()
    const snapshot = this.store.getHome()
    for (const key of ['levels', 'walls', 'rooms', 'furniture', 'dimensionLines', 'labels'] as const) {
      for (const item of snapshot[key]) known.add(item.id)
    }
    for (const id of ids) {
      assert(known.has(id), `selection references unknown id: ${id}`)
    }
    this.store.apply((h) => {
      h.selection = [...ids]
    })
    return [...ids]
  }

  setActiveTool(tool: ActiveTool): void {
    this.store.apply((h) => {
      h.activeTool = tool
    })
  }

  moveTopCamera(patch: Partial<Omit<NormalizedHomeState['cameras']['top'], 'lens'>>): void {
    requireFiniteNumbers(patch)
    this.store.apply((h) => {
      Object.assign(h.cameras.top, patch)
    })
  }

  moveObserverCamera(patch: Partial<NormalizedHomeState['cameras']['observer']>): void {
    requireFiniteNumbers(patch)
    this.store.apply((h) => {
      Object.assign(h.cameras.observer, patch)
    })
  }

  setCompass(patch: Partial<CompassState>): void {
    if (patch.diameter !== undefined) requirePositive(patch.diameter, 'diameter')
    requireFiniteNumbers(patch)
    this.store.apply((h) => {
      h.compass = { ...h.compass, ...patch }
    })
  }

  setEnvironment(patch: Partial<EnvironmentState>): void {
    if (patch.wallsAlpha !== undefined && patch.wallsAlpha !== null) {
      const alpha = patch.wallsAlpha
      assert(
        typeof alpha === 'number' && Number.isFinite(alpha) && alpha >= 0 && alpha <= 1,
        'wallsAlpha must be within [0, 1]',
      )
    }
    this.store.apply((h) => {
      h.environment = { ...h.environment, ...patch }
    })
  }

  private updateIn<K extends CollectionKey>(
    key: K,
    id: string,
    patch: Partial<NormalizedHomeState[K][number]>,
  ): NormalizedHomeState[K][number] {
    const rest: Record<string, unknown> = { ...(patch as Record<string, unknown>) }
    delete rest.id // ids are immutable; reassignment would break the ledger
    validatePatch(key, rest)
    requireFiniteNumbers(rest)
    let updated!: NormalizedHomeState[K][number]
    this.store.apply((h) => {
      const item = (h[key] as IdLike[]).find((candidate) => candidate.id === id)
      assert(item !== undefined, `unknown ${key} id: ${id}`)
      Object.assign(item, rest)
      updated = item as NormalizedHomeState[K][number]
    })
    return structuredClone(updated)
  }

  private removeFrom(key: CollectionKey, id: string, label: string): boolean {
    const snapshot = this.store.getHome()
    const exists = (snapshot[key] as IdLike[]).some((item) => item.id === id)
    assert(exists, `unknown ${label} id: ${id}`)
    this.store.apply((h) => {
      const list = h[key] as IdLike[]
      const index = list.findIndex((item) => item.id === id)
      if (index >= 0) list.splice(index, 1)
      const selection = h.selection.indexOf(id)
      if (selection >= 0) h.selection.splice(selection, 1)
    })
    return true
  }
}

function requireFiniteNumbers(record: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'number') requireFinite(value, key)
  }
}
