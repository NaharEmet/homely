import type { NormalizedHomeState } from '../core/home'
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
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void
  lineWidth: number
  strokeStyle: string
  fillStyle: string
  font: string
  setLineDash(dashes: Array<number>): void
}

const WALL_COLOR = '#5a5a5a'
const SELECTION_COLOR = '#1a66d6'
const ROOM_FILL = 'rgba(120, 170, 235, 0.25)'
const DIMENSION_COLOR = '#8a6d1a'
const LABEL_COLOR = '#333333'
const PREVIEW_COLOR = '#999999'
const FURNITURE_FILL = 'rgba(160, 160, 90, 0.5)'

/** Schema colors are 0xRRGGBB ints; CSS wants strings. */
function cssColor(color: number | null | undefined, fallback: string): string {
  if (color === null || color === undefined) return fallback
  return `#${(color >>> 0).toString(16).padStart(6, '0')}`
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

export function drawPlan(
  home: NormalizedHomeState,
  preview: PlanPreview | null,
  ctx: PlanRenderingContext,
  view: ViewTransform,
): void {
  const mapper = new ViewMapper(view)
  const selected = new Set(home.selection)

  // Rooms first (below everything).
  for (const room of home.rooms) {
    if (!room.floorVisible && !room.areaVisible) continue
    ctx.beginPath()
    room.points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(mapper.sx(x), mapper.sy(y))
      else ctx.lineTo(mapper.sx(x), mapper.sy(y))
    })
    ctx.closePath()
    ctx.fillStyle = cssColor(room.floorColor, ROOM_FILL)
    ctx.fill()
    if (selected.has(room.id)) {
      ctx.lineWidth = 2
      ctx.strokeStyle = SELECTION_COLOR
      ctx.stroke()
    }
    if (room.areaVisible && room.points.length > 0) {
      const centroidX = room.points.reduce((acc, [x]) => acc + x, 0) / room.points.length
      const centroidY = room.points.reduce((acc, [, y]) => acc + y, 0) / room.points.length
      ctx.fillStyle = '#5577aa'
      ctx.font = '12px sans-serif'
      ctx.fillText('room', mapper.sx(centroidX), mapper.sy(centroidY))
    }
  }

  // Walls as thick centerlines.
  for (const wall of home.walls) {
    ctx.beginPath()
    ctx.moveTo(mapper.sx(wall.xStart), mapper.sy(wall.yStart))
    ctx.lineTo(mapper.sx(wall.xEnd), mapper.sy(wall.yEnd))
    ctx.lineWidth = Math.max(wall.thickness * view.scale, 1)
    ctx.strokeStyle = selected.has(wall.id) ? SELECTION_COLOR : WALL_COLOR
    ctx.stroke()
  }

  // Furniture as rotated rectangles (x/y are the SH3D center point).
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
