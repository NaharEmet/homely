import type { NormalizedHomeState } from '../core/home'
import { wallOutlinePoints } from '../core/top-camera-follower'
import type { PlanPreview } from './engine'

export interface ViewTransform {
  scale: number
  offsetX: number
  offsetY: number
}

/** Minimal 2D context surface used by the renderer (real canvases satisfy it). */
export interface PlanRenderingContext {
  beginPath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  closePath(): void
  stroke(): void
  fill(): void
  fillRect(x: number, y: number, w: number, h: number): void
  fillText(text: string, x: number, y: number): void
  strokeRect(x: number, y: number, w: number, h: number): void
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void
  lineWidth: number
  strokeStyle: string
  fillStyle: string
  font: string
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
  setLineDash(dashes: Array<number>): void
}

const WALL_COLOR = '#5a5a5a'
const SELECTION_COLOR = '#1a66d6'
const ROOM_FILL = 'rgba(170, 200, 235, 0.3)'
const DIMENSION_COLOR = '#8a6d1a'
const LABEL_COLOR = '#333333'
const PREVIEW_COLOR = '#999999'
const FURNITURE_FILL = 'rgba(160, 160, 90, 0.5)'

const MINOR_GRID_COLOR = '#e8e8e8'
const MAJOR_GRID_COLOR = '#d0d0d0'

/** Schema colors are 0xRRGGBB ints; CSS wants strings. */
function cssColor(color: number | null | undefined, fallback: string): string {
  if (color === null || color === undefined) return fallback
  return `#${(color >>> 0).toString(16).padStart(6, '0')}`
}

/** Shoelace formula — returns area in cm². */
function shoelaceArea(points: Array<[number, number]>): number {
  let area = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const p1 = points[i]!
    const p2 = points[(i + 1) % n]!
    area += p1[0] * p2[1] - p2[0] * p1[1]
  }
  return Math.abs(area) / 2
}

export function fitToBounds(
  home: NormalizedHomeState,
  width: number,
  height: number,
  padding = 40,
): ViewTransform {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const grow = (x: number, y: number) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  for (const wall of home.walls) {
    grow(wall.xStart, wall.yStart)
    grow(wall.xEnd, wall.yEnd)
  }
  for (const room of home.rooms) {
    for (const [x, y] of room.points) grow(x, y)
  }
  for (const f of home.furniture) {
    grow(f.x - f.width / 2, f.y - f.depth / 2)
    grow(f.x + f.width / 2, f.y + f.depth / 2)
  }
  if (!Number.isFinite(minX)) return { scale: 1, offsetX: width / 2, offsetY: height / 2 }

  const spanX = Math.max(maxX - minX, 1)
  const spanY = Math.max(maxY - minY, 1)
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  return {
    scale,
    offsetX: width / 2 - centerX * scale,
    offsetY: height / 2 - centerY * scale,
  }
}

export class ViewMapper {
  constructor(private readonly view: ViewTransform) {}

  sx(x: number): number {
    return x * this.view.scale + this.view.offsetX
  }

  sy(y: number): number {
    return y * this.view.scale + this.view.offsetY
  }

  toModel(px: number, py: number): { x: number; y: number } {
    return {
      x: (px - this.view.offsetX) / this.view.scale,
      y: (py - this.view.offsetY) / this.view.scale,
    }
  }
}

function drawGrid(ctx: PlanRenderingContext, view: ViewTransform, width: number, height: number): void {
  const mapper = new ViewMapper(view)
  const topLeft = mapper.toModel(0, 0)
  const bottomRight = mapper.toModel(width, height)
  const minX = Math.min(topLeft.x, bottomRight.x)
  const maxX = Math.max(topLeft.x, bottomRight.x)
  const minY = Math.min(topLeft.y, bottomRight.y)
  const maxY = Math.max(topLeft.y, bottomRight.y)

  const minorStep = 10
  const majorStep = 100

  const startMinorX = Math.floor(minX / minorStep) * minorStep
  const startMinorY = Math.floor(minY / minorStep) * minorStep

  ctx.beginPath()
  for (let x = startMinorX; x <= maxX; x += minorStep) {
    if (x % majorStep === 0) continue
    const px = mapper.sx(x)
    ctx.moveTo(px, 0)
    ctx.lineTo(px, height)
  }
  for (let y = startMinorY; y <= maxY; y += minorStep) {
    if (y % majorStep === 0) continue
    const py = mapper.sy(y)
    ctx.moveTo(0, py)
    ctx.lineTo(width, py)
  }
  ctx.strokeStyle = MINOR_GRID_COLOR
  ctx.lineWidth = 0.5
  ctx.stroke()

  const startMajorX = Math.floor(minX / majorStep) * majorStep
  const startMajorY = Math.floor(minY / majorStep) * majorStep

  ctx.beginPath()
  for (let x = startMajorX; x <= maxX; x += majorStep) {
    const px = mapper.sx(x)
    ctx.moveTo(px, 0)
    ctx.lineTo(px, height)
  }
  for (let y = startMajorY; y <= maxY; y += majorStep) {
    const py = mapper.sy(y)
    ctx.moveTo(0, py)
    ctx.lineTo(width, py)
  }
  ctx.strokeStyle = MAJOR_GRID_COLOR
  ctx.lineWidth = 1
  ctx.stroke()
}

export function drawPlan(
  home: NormalizedHomeState,
  preview: PlanPreview | null,
  ctx: PlanRenderingContext,
  view: ViewTransform,
  canvasWidth?: number,
  canvasHeight?: number,
): void {
  const mapper = new ViewMapper(view)
  const selected = new Set(home.selection)

  if (canvasWidth != null && canvasHeight != null) {
    drawGrid(ctx, view, canvasWidth, canvasHeight)
  }

  // Rooms (floor fill + area label).
  for (const room of home.rooms) {
    if (room.points.length < 3) continue
    ctx.beginPath()
    room.points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(mapper.sx(x), mapper.sy(y))
      else ctx.lineTo(mapper.sx(x), mapper.sy(y))
    })
    ctx.closePath()

    const floorFill = cssColor(room.floorColor, ROOM_FILL)
    if (room.floorVisible !== false) {
      ctx.fillStyle = floorFill
      ctx.fill()
    }

    if (selected.has(room.id)) {
      ctx.lineWidth = 2
      ctx.strokeStyle = SELECTION_COLOR
      ctx.stroke()
    }

    const centroidX = room.points.reduce((acc, [x]) => acc + x, 0) / room.points.length
    const centroidY = room.points.reduce((acc, [, y]) => acc + y, 0) / room.points.length
    const areaCm2 = shoelaceArea(room.points)
    const areaM2 = (areaCm2 / 10000).toFixed(2)

    ctx.fillStyle = '#5577aa'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${areaM2} m²`, mapper.sx(centroidX), mapper.sy(centroidY))
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'

    if (room.name) {
      ctx.fillStyle = '#5577aa'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(room.name, mapper.sx(centroidX), mapper.sy(centroidY) - 14)
      ctx.textAlign = 'start'
      ctx.textBaseline = 'alphabetic'
    }
  }

  // Walls as filled thick shapes with mitered corners.
  for (const wall of home.walls) {
    const outline = wallOutlinePoints(wall, home.walls)
    if (outline.length === 0) continue
    ctx.beginPath()
    ctx.moveTo(mapper.sx(outline[0]![0]), mapper.sy(outline[0]![1]))
    for (let i = 1; i < outline.length; i++) {
      ctx.lineTo(mapper.sx(outline[i]![0]), mapper.sy(outline[i]![1]))
    }
    ctx.closePath()
    ctx.fillStyle = selected.has(wall.id)
      ? SELECTION_COLOR
      : cssColor(wall.leftSideColor, WALL_COLOR)
    ctx.fill()
    ctx.strokeStyle = cssColor(wall.rightSideColor, WALL_COLOR)
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  // Endpoint handles for selected walls.
  const HANDLE_SIZE = 6
  for (const wall of home.walls) {
    if (!selected.has(wall.id)) continue
    for (const [ex, ey] of [[wall.xStart, wall.yStart], [wall.xEnd, wall.yEnd]] as const) {
      const px = mapper.sx(ex)
      const py = mapper.sy(ey)
      ctx.fillStyle = '#1a66d6'
      ctx.fillRect(px - HANDLE_SIZE / 2, py - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(px - HANDLE_SIZE / 2, py - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE)
    }
  }

  // Furniture as rotated rectangles.
  for (const f of home.furniture) {
    const angleRad = (f.angleDeg * Math.PI) / 180
    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)
    const hw = f.width / 2
    const hd = f.depth / 2
    const offsets: Array<[number, number]> = [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ]
    const corners = offsets.map(([ox, oz]) => ({
      x: mapper.sx(f.x + ox * cos - oz * sin),
      y: mapper.sy(f.y + ox * sin + oz * cos),
    }))
    ctx.beginPath()
    corners.forEach((corner, index) => {
      if (index === 0) ctx.moveTo(corner.x, corner.y)
      else ctx.lineTo(corner.x, corner.y)
    })
    ctx.closePath()
    ctx.fillStyle = cssColor(f.color, FURNITURE_FILL)
    ctx.fill()
    if (selected.has(f.id)) {
      ctx.lineWidth = 2
      ctx.strokeStyle = SELECTION_COLOR
      ctx.stroke()

      // Corner drag handles.
      const handleSize = 6
      ctx.fillStyle = SELECTION_COLOR
      for (const corner of corners) {
        ctx.fillRect(
          corner.x - handleSize / 2,
          corner.y - handleSize / 2,
          handleSize,
          handleSize,
        )
      }
    }
  }

  // Dimension lines.
  for (const dim of home.dimensionLines) {
    ctx.beginPath()
    ctx.moveTo(mapper.sx(dim.xStart), mapper.sy(dim.yStart))
    ctx.lineTo(mapper.sx(dim.xEnd), mapper.sy(dim.yEnd))
    ctx.lineWidth = 1
    ctx.strokeStyle = selected.has(dim.id) ? SELECTION_COLOR : DIMENSION_COLOR
    ctx.stroke()
  }

  // Labels.
  for (const label of home.labels) {
    ctx.fillStyle = cssColor(
      label.color,
      selected.has(label.id) ? SELECTION_COLOR : LABEL_COLOR,
    )
    ctx.font = '12px sans-serif'
    ctx.fillText(label.text, mapper.sx(label.x), mapper.sy(label.y))
  }

  // Wall-tool preview: committed-but-unvalidated chain segments.
  if (preview && preview.phase === 'drawing') {
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = PREVIEW_COLOR
    ctx.lineWidth = 2
    for (const segment of preview.pendingWalls) {
      ctx.beginPath()
      ctx.moveTo(mapper.sx(segment.start.x), mapper.sy(segment.start.y))
      ctx.lineTo(mapper.sx(segment.end.x), mapper.sy(segment.end.y))
      ctx.stroke()
    }
    if (preview.chainStart) {
      ctx.beginPath()
      ctx.arc(mapper.sx(preview.chainStart.x), mapper.sy(preview.chainStart.y), 4, 0, Math.PI * 2)
      ctx.strokeStyle = PREVIEW_COLOR
      ctx.stroke()
    }
    ctx.setLineDash([])
  }
}
