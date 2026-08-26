import './style.css'
import { AutomationClient, automationPortFromSearch } from './automation/client'
import type { ClientStatus } from './automation/client'
import { HomeStore } from './core/store'
import { HomeModel } from './core/model'
import { HomelyCommandHandler } from './automation/homely-handler'
import { FurnitureCatalog } from './core/catalog'
import { loadDefaultCatalog } from './core/catalog-service'
import { CatalogPanel } from './ui/catalog-panel'
import { PlanEngine, type PlanPreview, type PlanTool } from './plan/engine'
import { ViewMapper, drawPlan, fitToBounds, type PlanRenderingContext, type ViewTransform } from './plan/renderer'

import { View3D } from './view3d'
import { PropertiesPanel } from './ui/properties-panel'

// ── DOM shell ───────────────────────────────────────────────────────────────

const root = document.querySelector<HTMLDivElement>('#root')!

root.innerHTML = `
  <div id="menu-bar"></div>
  <div id="toolbar"></div>
  <div id="main-area">
    <div id="catalog-host"></div>
    <div id="plan-panel" class="panel">
      <canvas id="plan-canvas"></canvas>
    </div>
    <div id="divider"></div>
    <div id="view3d-panel" class="panel">
      <div id="view3d"></div>
    </div>
  </div>
  <div id="status-bar">
    <span id="status-cursor">x: 0  y: 0</span>
    <span id="status-tool">selection</span>
    <span id="status-zoom">zoom: 100%</span>
    <span id="status-automation">automation: idle</span>
  </div>
`

const menuBar = root.querySelector<HTMLDivElement>('#menu-bar')!
const toolbar = root.querySelector<HTMLDivElement>('#toolbar')!
const catalogHost = root.querySelector<HTMLDivElement>('#catalog-host')!
const planPanel = root.querySelector<HTMLDivElement>('#plan-panel')!
const view3dPanel = root.querySelector<HTMLDivElement>('#view3d-panel')!
const divider = root.querySelector<HTMLDivElement>('#divider')!
const canvas = root.querySelector<HTMLCanvasElement>('#plan-canvas')!
const statusCursor = root.querySelector<HTMLSpanElement>('#status-cursor')!
const statusTool = root.querySelector<HTMLSpanElement>('#status-tool')!
const statusZoom = root.querySelector<HTMLSpanElement>('#status-zoom')!
const statusAutomation = root.querySelector<HTMLSpanElement>('#status-automation')!
const ctx = canvas.getContext('2d')

// ── Store + engine ──────────────────────────────────────────────────────────

const store = new HomeStore()
const model = new HomeModel(store)
const engine = new PlanEngine(model)

// Catalog panel — declared here (used by canvas/key closures) and
// instantiated in boot once the DOM host exists.
let catalogPanel: CatalogPanel | null = null

let automationText = 'idle'
let currentView: ViewTransform = { scale: 1, offsetX: 0, offsetY: 0 }
let spaceHeld = false
let isPanning = false
let panLastX = 0
let panLastY = 0

const ZOOM_MIN = 0.1
const ZOOM_MAX = 10.0

// ── Menu bar ────────────────────────────────────────────────────────────────

interface MenuDef {
  label: string
  items: Array<{ label: string; shortcut?: string; action?: () => void; disabled?: boolean }>
}

function buildMenu(menus: MenuDef[]): void {
  menuBar.innerHTML = ''
  for (const menu of menus) {
    const item = document.createElement('div')
    item.className = 'menu-item'

    const trigger = document.createElement('button')
    trigger.className = 'menu-trigger'
    trigger.textContent = menu.label

    const dropdown = document.createElement('div')
    dropdown.className = 'menu-dropdown'

    for (const entry of menu.items) {
      if (entry.label === '---') {
        const sep = document.createElement('div')
        sep.className = 'menu-separator'
        dropdown.appendChild(sep)
        continue
      }
      const btn = document.createElement('button')
      btn.className = 'menu-entry'
      if (entry.disabled) btn.disabled = true
      const labelSpan = document.createElement('span')
      labelSpan.textContent = entry.label
      btn.appendChild(labelSpan)
      if (entry.shortcut) {
        const kbd = document.createElement('span')
        kbd.className = 'menu-shortcut'
        kbd.textContent = entry.shortcut
        btn.appendChild(kbd)
      }
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        closeAllMenus()
        entry.action?.()
      })
      dropdown.appendChild(btn)
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation()
      const wasOpen = item.classList.contains('open')
      closeAllMenus()
      if (!wasOpen) item.classList.add('open')
    })

    item.appendChild(trigger)
    item.appendChild(dropdown)
    menuBar.appendChild(item)
  }
}

function closeAllMenus(): void {
  menuBar.querySelectorAll('.menu-item.open').forEach((el) => el.classList.remove('open'))
}

document.addEventListener('click', closeAllMenus)

const hasUndo = () => store.canUndo()
const hasRedo = () => store.canRedo()

function refreshMenus(): void {
  buildMenu([
    {
      label: 'File',
      items: [
        { label: 'New', action: () => { store.resetToEmpty(); refreshAll() } },
        { label: '---' },
        { label: 'Save', action: () => alert('Save: not implemented yet') },
        { label: 'Open', action: () => alert('Open: not implemented yet') },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => { store.undo(); refreshAll() }, disabled: !hasUndo() },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => { store.redo(); refreshAll() }, disabled: !hasRedo() },
        { label: '---' },
        { label: 'Delete', action: () => { engine.key('delete'); refreshAll() } },
        { label: 'Select All', action: () => alert('Select All: not implemented yet') },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Plan View', action: () => setCameraPreset('plan') },
        { label: '3D View', action: () => setCameraPreset('3d') },
        { label: 'Split View', action: () => setCameraPreset('split') },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'About Homely', action: () => alert('Homely — Sweet Home 3D clone\nTauri + Three.js + TypeScript') },
      ],
    },
  ])
}

// ── Toolbar ─────────────────────────────────────────────────────────────────

function buildToolbar(): void {
  toolbar.innerHTML = `
    <div class="tool-group">
      <button class="tool-btn" data-tool="selection" title="Selection (V)">Select</button>
      <button class="tool-btn" data-tool="wall" title="Wall tool (W)">Wall</button>
      <button class="tool-btn" data-tool="room" title="Room — coming soon" disabled>Room</button>
      <button class="tool-btn" data-tool="dimensionLine" title="Dimension — coming soon" disabled>Dim</button>
      <button class="tool-btn" data-tool="label" title="Text — coming soon" disabled>Text</button>
      <button class="tool-btn" id="btn-catalog" title="Furniture catalog (F)">Furniture</button>
    </div>
    <div class="tool-separator"></div>
    <div class="tool-group">
      <button class="tool-btn" id="btn-undo" title="Undo (Ctrl+Z)">Undo</button>
      <button class="tool-btn" id="btn-redo" title="Redo (Ctrl+Y)">Redo</button>
    </div>
    <div class="tool-separator"></div>
    <label><input id="magnetism" type="checkbox" checked /> Mag</label>
    <div class="toolbar-spacer"></div>
    <button class="tool-btn" id="btn-fit" title="Zoom to fit (double-click middle)">Fit</button>
    <div class="tool-separator"></div>
    <div class="camera-toggle">
      <button class="tool-btn active" data-preset="split" title="Split view">Split</button>
      <button class="tool-btn" data-preset="plan" title="Plan only">Plan</button>
      <button class="tool-btn" data-preset="3d" title="3D only">3D</button>
    </div>
    <button class="tool-btn" id="dark-toggle" title="Toggle dark mode">◐</button>
  `

  for (const btn of toolbar.querySelectorAll<HTMLButtonElement>('button[data-tool]')) {
    btn.addEventListener('click', () => {
      try { engine.setTool(btn.dataset.tool as PlanTool) } catch { /* ignore */ }
      refreshToolbar()
      refreshStatus()
    })
  }

  toolbar.querySelector('#btn-undo')!.addEventListener('click', () => { store.undo(); refreshAll() })
  toolbar.querySelector('#btn-redo')!.addEventListener('click', () => { store.redo(); refreshAll() })

  toolbar.querySelector('#magnetism')!.addEventListener('change', (e) => {
    engine.setMagnetism((e.target as HTMLInputElement).checked)
  })

  toolbar.querySelector('#btn-fit')!.addEventListener('click', () => {
    userHasZoomed = false
    currentView = fitToBounds(store.getHome(), canvas.width, canvas.height)
    refreshStatus()
  })

  for (const btn of toolbar.querySelectorAll<HTMLButtonElement>('button[data-preset]')) {
    btn.addEventListener('click', () => setCameraPreset(btn.dataset.preset as string))
  }

  toolbar.querySelector('#dark-toggle')!.addEventListener('click', toggleDarkMode)

  toolbar.querySelector('#btn-catalog')!.addEventListener('click', () => {
    catalogHost.classList.toggle('collapsed')
    resizeCanvas()
    refreshStatus()
  })
}

function refreshToolbar(): void {
  const tool = engine.getTool()
  for (const btn of toolbar.querySelectorAll<HTMLButtonElement>('button[data-tool]')) {
    btn.classList.toggle('active', btn.dataset.tool === tool)
  }
  const magBox = toolbar.querySelector<HTMLInputElement>('#magnetism')
  if (magBox) magBox.checked = engine.isMagnetismEnabled()

  const undoBtn = toolbar.querySelector<HTMLButtonElement>('#btn-undo')!
  const redoBtn = toolbar.querySelector<HTMLButtonElement>('#btn-redo')!
  undoBtn.disabled = !hasUndo()
  redoBtn.disabled = !hasRedo()
}

// ── Status bar ──────────────────────────────────────────────────────────────

function refreshStatus(): void {
  const preview = engine.getPreview()
  const tool = engine.getTool()
  const phase = preview.phase === 'drawing' ? ' (drawing…)' : ''
  statusTool.textContent = `${tool}${phase}`
  statusAutomation.textContent = `automation: ${automationText}`
  statusZoom.textContent = `zoom: ${Math.round(currentView.scale * 100)}%`
}

// ── Camera preset ───────────────────────────────────────────────────────────

function setCameraPreset(preset: string): void {
  planPanel.classList.remove('hidden')
  view3dPanel.classList.remove('hidden')
  divider.style.display = ''

  if (preset === 'plan') {
    view3dPanel.classList.add('hidden')
    divider.style.display = 'none'
  } else if (preset === '3d') {
    planPanel.classList.add('hidden')
    divider.style.display = 'none'
  }

  for (const btn of toolbar.querySelectorAll<HTMLButtonElement>('button[data-preset]')) {
    btn.classList.toggle('active', btn.dataset.preset === preset)
  }

  resizeCanvas()
}

// ── Dark mode ───────────────────────────────────────────────────────────────

const DARK_KEY = 'homely-dark-mode'

function applyDarkMode(): void {
  const stored = localStorage.getItem(DARK_KEY)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = stored !== null ? stored === 'true' : prefersDark
  document.body.classList.toggle('dark', dark)
}

function toggleDarkMode(): void {
  const current = document.body.classList.contains('dark')
  const next = !current
  localStorage.setItem(DARK_KEY, String(next))
  document.body.classList.toggle('dark', next)
}

applyDarkMode()

// ── Draggable divider ───────────────────────────────────────────────────────

let dragging = false

divider.addEventListener('pointerdown', (e) => {
  dragging = true
  divider.classList.add('dragging')
  divider.setPointerCapture(e.pointerId)
  e.preventDefault()
})

divider.addEventListener('pointermove', (e) => {
  if (!dragging) return
  const mainRect = root.querySelector('#main-area')!.getBoundingClientRect()
  const isVertical = window.innerWidth >= 800

  if (isVertical) {
    const pct = ((e.clientX - mainRect.left) / mainRect.width) * 100
    const clamped = Math.max(15, Math.min(85, pct))
    planPanel.style.flex = `0 0 ${clamped}%`
    view3dPanel.style.flex = `0 0 ${100 - clamped}%`
  } else {
    const pct = ((e.clientY - mainRect.top) / mainRect.height) * 100
    const clamped = Math.max(15, Math.min(85, pct))
    planPanel.style.flex = `0 0 ${clamped}%`
    view3dPanel.style.flex = `0 0 ${100 - clamped}%`
  }
  resizeCanvas()
})

divider.addEventListener('pointerup', () => {
  dragging = false
  divider.classList.remove('dragging')
})

// ── Canvas input (screen px -> model cm) ────────────────────────────────────

interface PointerState {
  down: boolean
  startX: number
  startY: number
  lastX: number
  lastY: number
  moved: boolean
  shift: boolean
  button: number
}

const pointer: PointerState = {
  down: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  moved: false,
  shift: false,
  button: 0,
}

function eventModelPoint(event: PointerEvent | MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const px = (event.clientX - rect.left) * scaleX
  const py = (event.clientY - rect.top) * scaleY
  return new ViewMapper(currentView).toModel(px, py)
}

function canvasPixelCoords(event: PointerEvent | MouseEvent): { px: number; py: number } {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    px: (event.clientX - rect.left) * scaleX,
    py: (event.clientY - rect.top) * scaleY,
  }
}

// Middle-click pan
canvas.addEventListener('pointerdown', (event) => {
  if (event.button === 1) {
    isPanning = true
    userHasZoomed = true
    panLastX = event.clientX
    panLastY = event.clientY
    canvas.setPointerCapture(event.pointerId)
    event.preventDefault()
    return
  }

  // Space + left-click: start pan
  if (event.button === 0 && spaceHeld) {
    isPanning = true
    userHasZoomed = true
    panLastX = event.clientX
    panLastY = event.clientY
    canvas.setPointerCapture(event.pointerId)
    return
  }

  if (event.button !== 0) return
  canvas.setPointerCapture(event.pointerId)
  const point = eventModelPoint(event)
  pointer.down = true
  pointer.moved = false
  pointer.shift = event.shiftKey
  pointer.button = event.button
  pointer.startX = point.x
  pointer.startY = point.y
  pointer.lastX = point.x
  pointer.lastY = point.y
})

canvas.addEventListener('pointermove', (event) => {
  const coords = canvasPixelCoords(event)
  const pt = new ViewMapper(currentView).toModel(coords.px, coords.py)
  statusCursor.textContent = `x: ${pt.x.toFixed(1)}  y: ${pt.y.toFixed(1)}`

  // Cursor management for selection tool
  if (engine.getTool() === 'selection' && !isPanning && !pointer.down) {
    const hit = engine.hitTestPoint(pt)
    if (!hit) {
      canvas.style.cursor = 'default'
    } else if (hit.kind === 'wall-endpoint') {
      canvas.style.cursor = 'crosshair'
    } else if (hit.kind === 'wall-body') {
      canvas.style.cursor = 'move'
    } else {
      canvas.style.cursor = 'pointer'
    }
  } else if (engine.isVertexDragging()) {
    canvas.style.cursor = 'crosshair'
  }

  if (isPanning) {
    const dx = event.clientX - panLastX
    const dy = event.clientY - panLastY
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    currentView.offsetX += dx * scaleX
    currentView.offsetY += dy * scaleY
    panLastX = event.clientX
    panLastY = event.clientY
    return
  }

  if (!pointer.down) return
  const point = eventModelPoint(event)
  const dxPx = Math.abs(point.x - pointer.startX)
  const dyPx = Math.abs(point.y - pointer.startY)
  if (dxPx > 2 || dyPx > 2) pointer.moved = true
  pointer.lastX = point.x
  pointer.lastY = point.y
})

canvas.addEventListener('pointerup', (event) => {
  if (isPanning) {
    isPanning = false
    return
  }
  if (!pointer.down) return
  pointer.down = false
  const point = eventModelPoint(event)

  // Catalog place mode: a plain click commits the armed piece at the point.
  if (!pointer.moved && catalogPanel?.isArmed()) {
    catalogPanel.place(point.x, point.y)
    refreshToolbar()
    refreshStatus()
    return
  }

  if (pointer.moved) {
    engine.drag({
      fromX: pointer.startX,
      fromY: pointer.startY,
      toX: point.x,
      toY: point.y,
      shift: pointer.shift,
      altOrMeta: event.altKey || event.metaKey,
    })
  } else {
    engine.click({
      x: point.x,
      y: point.y,
      dbl: false,
      shift: event.shiftKey,
      altOrMeta: event.altKey || event.metaKey,
    })
  }
  refreshToolbar()
  refreshStatus()
})

canvas.addEventListener('dblclick', (event) => {
  if (event.button === 1) {
    userHasZoomed = false
    currentView = fitToBounds(store.getHome(), canvas.width, canvas.height)
    refreshStatus()
    return
  }
  const point = eventModelPoint(event)
  engine.click({ x: point.x, y: point.y, dbl: true, shift: event.shiftKey })
  refreshToolbar()
  refreshStatus()
})

// Scroll wheel zoom centered on cursor
canvas.addEventListener('wheel', (event) => {
  event.preventDefault()
  userHasZoomed = true
  const { px, py } = canvasPixelCoords(event)
  const modelBefore = new ViewMapper(currentView).toModel(px, py)

  const factor = event.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, currentView.scale * factor))
  currentView.scale = newScale

  // Adjust offset so the model point under the cursor stays fixed.
  currentView.offsetX = px - modelBefore.x * currentView.scale
  currentView.offsetY = py - modelBefore.y * currentView.scale

  refreshStatus()
}, { passive: false })

window.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    event.preventDefault()
    store.undo()
    refreshAll()
    return
  }
  if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.shiftKey && event.key === 'z'))) {
    event.preventDefault()
    store.redo()
    refreshAll()
    return
  }

  if (event.key === ' ' && !event.repeat) {
    event.preventDefault()
    spaceHeld = true
    canvas.style.cursor = 'grab'
    return
  }

  if (event.key === 'f' || event.key === 'F') {
    event.preventDefault()
    catalogHost.classList.toggle('collapsed')
    resizeCanvas()
    refreshStatus()
    return
  }

  // Catalog place mode: Escape disarms instead of switching tools.
  if (event.key === 'Escape' && catalogPanel?.isArmed()) {
    event.preventDefault()
    catalogPanel.disarm()
    refreshStatus()
    return
  }

  let key: 'escape' | 'delete' | 'backspace' | null = null
  if (event.key === 'Escape') key = 'escape'
  else if (event.key === 'Delete') key = 'delete'
  else if (event.key === 'Backspace') key = 'backspace'
  else if (event.key === ']') { propsPanel.toggle(); return }
  if (key === null) return
  event.preventDefault()
  engine.key(key)
  refreshToolbar()
  refreshStatus()
})

window.addEventListener('keyup', (event) => {
  if (event.key === ' ') {
    spaceHeld = false
    canvas.style.cursor = ''
  }
})

// ── Render loop ─────────────────────────────────────────────────────────────

function render(): void {
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const home = store.getHome()
  const preview: PlanPreview | null = engine.getPreview()
  if (!userHasZoomed) {
    currentView = fitToBounds(home, canvas.width, canvas.height)
  }
  const rc = ctx as unknown as PlanRenderingContext
  drawPlan(home, preview, rc, currentView, canvas.width, canvas.height)
}

let userHasZoomed = false

function frame(): void {
  render()
  requestAnimationFrame(frame)
}

function resizeCanvas(): void {
  const w = planPanel.clientWidth
  const h = planPanel.clientHeight
  canvas.width = Math.max(320, Math.floor(w))
  canvas.height = Math.max(200, Math.floor(h))
}

function refreshAll(): void {
  refreshMenus()
  refreshToolbar()
  refreshStatus()
}

// ── Boot ────────────────────────────────────────────────────────────────────

refreshMenus()
buildToolbar()
resizeCanvas()
refreshToolbar()
refreshStatus()
window.addEventListener('resize', resizeCanvas)
requestAnimationFrame(frame)

// 3D view — creates its own renderer inside #view3d
new View3D(store, { container: root.querySelector<HTMLDivElement>('#view3d')! })

// Properties panel — right sidebar
const mainArea = root.querySelector<HTMLDivElement>('#main-area')!
const propsPanel = new PropertiesPanel(store, mainArea)

// Furniture catalog panel — left sidebar (ticket U7). Loaded async from the
// bundled manifest; until it resolves, place mode is unavailable. connectAutomation
// awaits this so the shared catalog reaches the automation handler too.
let sharedCatalog: FurnitureCatalog | null = null
const catalogReady = loadDefaultCatalog().then(({ catalog }) => {
  sharedCatalog = catalog
  catalogPanel = new CatalogPanel({
    catalog,
    onPlace: (item, x, y, angleDeg) => {
      const placed = model.addFurniture({
        name: item.name,
        catalogId: item.catalogId,
        x,
        y,
        angleDeg,
        width: item.width,
        depth: item.depth,
        height: item.height,
        elevation: item.elevation ?? 0,
        color: item.color ?? null,
        doorOrWindow: item.doorOrWindow ?? false,
      })
      model.setSelection([placed.id])
      refreshToolbar()
      refreshStatus()
      return placed.id
    },
    onPlaceModeChange: (active) => {
      canvas.style.cursor = active ? 'crosshair' : ''
    },
  })
  catalogHost.appendChild(catalogPanel.element)
}).catch((err) => {
  console.error('[catalog] failed to load catalog:', err)
  statusAutomation.textContent = 'automation: catalog unavailable'
})

// ── Automation ──────────────────────────────────────────────────────────────

async function connectAutomation(): Promise<void> {
  const queryPort = automationPortFromSearch(window.location.search)
  let port = queryPort
  if (port === null && '__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core')
    const raw = await invoke<string | null>('automation_port')
    port = raw === null ? null : Number(raw)
  }
  if (port !== null) {
    await catalogReady // ensure the shared catalog reaches the handler
    new AutomationClient(new HomelyCommandHandler(store, { planEngine: engine, catalog: sharedCatalog }), {
      port,
      mode: 'gui',
      onStatus: (status: ClientStatus) => {
        automationText = status
        refreshStatus()
      },
    })
  } else {
    automationText = 'idle (launch with ?automationPort=<port>)'
    refreshStatus()
  }
}
void connectAutomation()
