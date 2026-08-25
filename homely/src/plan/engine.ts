import type { HomeModel } from '../core/model'
import { ModelError } from '../core/model'
import type { NormalizedHomeState } from '../core/home'
import { wallPointMagnetism } from './magnetism'
import {
  distance,
  distToSegment,
  type Point,
} from './geometry'

export const PLAN_SCALE = 1
export const PIXEL_MARGIN = 4 * PLAN_SCALE
export const WALL_ENDS_PIXEL_MARGIN = 2 * PLAN_SCALE
const EPSILON = 1e-6

export type PlanTool =
  | 'selection'
  | 'panning'
  | 'wall'
  | 'room'
  | 'polyline'
  | 'dimensionLine'
  | 'label'

export interface ClickInput {
  x: number
  y: number
  dbl?: boolean
  shift?: boolean
  altOrMeta?: boolean
}

export interface DragInput {
  fromX: number
  fromY: number
  toX: number
  toY: number
  shift?: boolean
  altOrMeta?: boolean
}

export type PlanKey = 'escape' | 'delete' | 'backspace'

interface Segment {
  start: Point
  end: Point
}

export interface PlanPreview {
  tool: PlanTool
  phase: 'idle' | 'drawing'
  chainStart: Point | null
  pendingWalls: Array<Segment>
}

function samePoint(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON
}

export class PlanEngine {
  private readonly model: HomeModel
  private tool: PlanTool = 'selection'
  private magnetismEnabled = true
  private phase: 'idle' | 'drawing' = 'idle'
  private chainStart: Point | null = null
  private segments: Array<Segment> = []

  constructor(model: HomeModel) {
    this.model = model
  }

  private homeSnapshot(): NormalizedHomeState {
    return this.model.getStore().getHome()
  }

  getTool(): PlanTool {
    return this.tool
  }

  setTool(tool: PlanTool): void {
    this.validateTool(tool)
    if (this.phase === 'drawing') this.validateDrawnWalls()
    this.tool = tool
    if (tool !== 'wall') this.phase = 'idle'
    // Mirror the tool into home state without polluting undo history.
    this.model.getStore().patchNonUndoable((h) => {
      h.activeTool = tool === 'panning' ? 'panning' : (tool as never)
    })
  }

  setMagnetism(enabled: boolean): void {
    this.magnetismEnabled = enabled === true
  }

  isMagnetismEnabled(): boolean {
    return this.magnetismEnabled
  }

  getPreview(): PlanPreview {
    return {
      tool: this.tool,
      phase: this.phase,
      chainStart: this.chainStart,
      pendingWalls: this.segments.map((s) => ({ ...s })),
    }
  }

  click(input: ClickInput): void {
    this.validateClick(input)
    const point = { x: input.x, y: input.y }
    if (input.dbl) {
      this.doubleClick(point)
    } else {
      this.singleClick(point, input.shift === true)
    }
  }

  drag(input: DragInput): void {
    this.validateDrag(input)
    const from = { x: input.fromX, y: input.fromY }
    const to = { x: input.toX, y: input.toY }
    if (this.tool !== 'selection') return
    const home = this.homeSnapshot()
    const hit = this.hitTest(home, from)
    if (hit) {
      if (!home.selection.includes(hit)) {
        this.model.setSelection([hit])
      }
      this.model.moveSelection(to.x - from.x, to.y - from.y)
    } else {
      const minX = Math.min(from.x, to.x)
      const maxX = Math.max(from.x, to.x)
      const minY = Math.min(from.y, to.y)
      const maxY = Math.max(from.y, to.y)
      const inside = (p: Point) =>
        p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY
      const picked = new Set<string>()
      for (const wall of home.walls) {
        const mid = {
          x: (wall.xStart + wall.xEnd) / 2,
          y: (wall.yStart + wall.yEnd) / 2,
        }
        if (
          inside({ x: wall.xStart, y: wall.yStart }) ||
          inside({ x: wall.xEnd, y: wall.yEnd }) ||
          inside(mid)
        ) {
          picked.add(wall.id)
        }
      }
      for (const room of home.rooms) {
        const sumX = room.points.reduce((acc: number, pt) => acc + pt[0], 0)
        const sumY = room.points.reduce((acc: number, pt) => acc + pt[1], 0)
        const cx = sumX / room.points.length
        const cy = sumY / room.points.length
        if (inside({ x: cx, y: cy })) picked.add(room.id)
      }
      for (const furniture of home.furniture) {
        if (inside({ x: furniture.x, y: furniture.y })) picked.add(furniture.id)
      }
      const merged =
        input.shift === true
          ? [...new Set([...home.selection, ...picked])]
          : [...picked]
      this.model.setSelection(merged)
    }
  }

  key(key: PlanKey): void {
    if (key !== 'escape' && key !== 'delete' && key !== 'backspace') {
      throw new ModelError(`unsupported key ${JSON.stringify(key)}`)
    }
    if ((key === 'delete' || key === 'backspace') && this.tool === 'selection') {
      const selection = this.homeSnapshot().selection
      if (selection.length > 0) this.model.removeItems(selection)
      return
    }
    if (key !== 'escape') return

    if (this.tool === 'wall' && this.phase === 'drawing') {
      this.validateDrawnWalls()
      return
    }
    this.setTool('selection')
  }

  private singleClick(point: Point, shift: boolean): void {
    if (this.tool === 'selection') {
      const home = this.homeSnapshot()
      const hit = this.hitTest(home, point)
      if (!hit) {
        if (!shift) this.model.setSelection([])
        return
      }
      const selection = home.selection
      if (shift) {
        this.model.setSelection(
          selection.includes(hit)
            ? selection.filter((id) => id !== hit)
            : [...selection, hit],
        )
      } else if (!selection.includes(hit)) {
        this.model.setSelection([hit])
      } else {
        this.model.setSelection([...selection])
      }
      return
    }
    if (this.tool !== 'wall') return

    if (this.phase === 'idle') {
      const start = this.resolveChainStart(point)
      this.model.setSelection([])
      this.chainStart = start
      this.segments = []
      this.phase = 'drawing'
      return
    }

    const start = this.chainStart!
    const end = this.resolveSegmentEnd(start, point)
    if (distance(start, end) <= 0) return
    this.segments.push({ start, end })
    this.chainStart = end
  }

  private doubleClick(point: Point): void {
    if (this.tool !== 'wall' || this.phase !== 'drawing') return
    const start = this.chainStart!
    const end = this.resolveSegmentEnd(start, point)
    if (distance(start, end) > 0) {
      this.segments.push({ start, end })
    }
    this.validateDrawnWalls()
  }

  /**
   * Commits accumulated segments as ONE undoable compound operation,
   * mirroring SH3D PlanController.validateDrawnWalls/postCreateWalls.
   */
  private validateDrawnWalls(): void {
    const segments = this.segments
    this.segments = []
    this.chainStart = null
    this.phase = 'idle'
    if (segments.length === 0) return

    const closesCycle = segments.length >= 3 && samePoint(segments[0]!.start, segments[segments.length - 1]!.end)

    this.model.addWallChain(
      segments.map((segment) => ({
        xStart: segment.start.x,
        yStart: segment.start.y,
        xEnd: segment.end.x,
        yEnd: segment.end.y,
      })),
      closesCycle,
    )
  }

  /**
   * Chain start snaps to a FREE end/start of an existing wall within
   * PIXEL_MARGIN (getWallEndAt/getWallStartAt semantics); otherwise it is
   * the plain point (no angle reference exists for the first click).
   */
  private resolveChainStart(point: Point): Point {
    const home = this.homeSnapshot()
    const free = this.freeEndpointAt(home, point, PIXEL_MARGIN)
    if (free) return free
    return point
  }

  /**
   * Segment end resolution order (SH3D WallDrawingState.moveMouse):
   * 1. exact join onto a FREE endpoint within PIXEL_MARGIN
   * 2. angle+length magnetization plus per-axis wall-endpoint snapping
   */
  private resolveSegmentEnd(start: Point, point: Point): Point {
    const home = this.homeSnapshot()
    const free = this.freeEndpointAt(home, point, PIXEL_MARGIN)
    if (free) return free
    return wallPointMagnetism(start, point, home.walls, {
      enabled: this.magnetismEnabled,
      maxDelta: PLAN_SCALE,
      endpointMargin: WALL_ENDS_PIXEL_MARGIN * 2,
    })
  }

  private freeEndpointAt(
    home: NormalizedHomeState,
    point: Point,
    margin: number,
  ): Point | null {
    let best: Point | null = null
    let bestDist = margin
    const candidates: Array<{ p: Point; occupied: boolean }> = []
    for (const wall of home.walls) {
      candidates.push(
        {
          p: { x: wall.xStart, y: wall.yStart },
          occupied: this.hasOtherWallAt(home, wall.id, { x: wall.xStart, y: wall.yStart }),
        },
        {
          p: { x: wall.xEnd, y: wall.yEnd },
          occupied: this.hasOtherWallAt(home, wall.id, { x: wall.xEnd, y: wall.yEnd }),
        },
      )
    }
    // Pending (not yet committed) chain segments are always joinable —
    // SH3D materializes them into the home during drawing, so closing a
    // loop by double-click lands exactly on the chain's first point.
    for (const segment of this.segments) {
      candidates.push({ p: segment.start, occupied: false }, { p: segment.end, occupied: false })
    }
    for (const candidate of candidates) {
      if (candidate.occupied) continue
      const dist = distance(point, candidate.p)
      if (dist <= bestDist) {
        bestDist = dist
        best = candidate.p
      }
    }
    return best
  }

  private hasOtherWallAt(
    home: NormalizedHomeState,
    wallId: string,
    point: Point,
  ): boolean {
    return home.walls.some(
      (other) =>
        other.id !== wallId &&
        (samePoint(point, { x: other.xStart, y: other.yStart }) ||
          samePoint(point, { x: other.xEnd, y: other.yEnd })),
    )
  }

  private hitTest(home: NormalizedHomeState, point: Point): string | null {
    for (let i = home.furniture.length - 1; i >= 0; i--) {
      const f = home.furniture[i]!
      // SH3D furniture x/y is the piece CENTER.
      if (
        point.x >= f.x - f.width / 2 &&
        point.x <= f.x + f.width / 2 &&
        point.y >= f.y - f.depth / 2 &&
        point.y <= f.y + f.depth / 2
      ) {
        return f.id
      }
    }
    for (let i = home.walls.length - 1; i >= 0; i--) {
      const wall = home.walls[i]!
      const dist = distToSegment(
        point,
        { x: wall.xStart, y: wall.yStart },
        { x: wall.xEnd, y: wall.yEnd },
      )
      if (dist <= Math.max(wall.thickness / 2, 2) + 1) return wall.id
    }
    for (const room of home.rooms) {
      if (this.pointInPolygon(point, room.points)) return room.id
    }
    for (const label of home.labels) {
      if (Math.abs(point.x - label.x) <= 20 && Math.abs(point.y - label.y) <= 10) {
        return label.id
      }
    }
    for (const dim of home.dimensionLines) {
      const dist = distToSegment(
        point,
        { x: dim.xStart, y: dim.yStart },
        { x: dim.xEnd, y: dim.yEnd },
      )
      if (dist <= PIXEL_MARGIN) return dim.id
    }
    return null
  }

  private pointInPolygon(point: Point, polygon: Array<[number, number]>): boolean {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i]![0]!
      const yi = polygon[i]![1]!
      const xj = polygon[j]![0]!
      const yj = polygon[j]![1]!
      const intersects =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
      if (intersects) inside = !inside
    }
    return inside
  }

  private validateTool(tool: PlanTool): void {
    const allowed: Array<PlanTool> = [
      'selection',
      'panning',
      'wall',
      'room',
      'polyline',
      'dimensionLine',
      'label',
    ]
    if (!allowed.includes(tool)) {
      throw new ModelError(`unknown tool ${JSON.stringify(tool)}`)
    }
  }

  private validateClick(input: ClickInput): void {
    if (typeof input?.x !== 'number' || !Number.isFinite(input.x)) {
      throw new ModelError('click param x must be a finite number')
    }
    if (typeof input?.y !== 'number' || !Number.isFinite(input.y)) {
      throw new ModelError('click param y must be a finite number')
    }
  }

  private validateDrag(input: DragInput): void {
    for (const field of ['fromX', 'fromY', 'toX', 'toY'] as const) {
      const value = input?.[field]
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ModelError(`drag param ${field} must be a finite number`)
      }
    }
  }
}

