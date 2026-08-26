import './style.css'
import { AutomationClient, automationPortFromSearch } from './automation/client'
import type { ClientStatus } from './automation/client'
import { HomeStore } from './core/store'
import { HomeModel } from './core/model'
import { HomelyCommandHandler } from './automation/homely-handler'
import { PlanEngine, type PlanPreview, type PlanTool } from './plan/engine'
import { ViewMapper, drawPlan, fitToBounds, type PlanRenderingContext } from './plan/renderer'
import { View3D } from './view3d'

const root = document.querySelector<HTMLDivElement>('#root')!
root.innerHTML = `
  <main>
    <h1>Homely</h1>
    <p id="status">automation: idle</p>
    <div id="toolbar">
      <button data-tool="selection" class="active">Select</button>
      <button data-tool="wall">Wall</button>
      <label><input id="magnetism" type="checkbox" checked /> magnetism</label>
    </div>
    <canvas id="plan-canvas"></canvas>
    <div id="view3d"></div>
  </main>
`
const statusEl = root.querySelector<HTMLParagraphElement>('#status')!
const canvas = root.querySelector<HTMLCanvasElement>('#plan-canvas')!
const toolbar = root.querySelector<HTMLDivElement>('#toolbar')!
const magnetismBox = root.querySelector<HTMLInputElement>('#magnetism')!
const ctx = canvas.getContext('2d')

function setStatus(text: string): void {
  statusEl.textContent = text
}

// One store + one plan engine shared by the UI and the automation bridge.
const store = new HomeStore()
const engine = new PlanEngine(new HomeModel(store))

let automationText = 'idle'
let toolText = 'tool: selection'

function refreshStatus(): void {
  const preview = engine.getPreview()
  const phase = preview.phase === 'drawing' ? ' (drawing…)' : ''
  setStatus(`automation: ${automationText} · ${toolText}${phase}`)
}

// --- Toolbar ---------------------------------------------------------------

function syncToolbar(): void {
  const tool = engine.getTool()
  for (const button of toolbar.querySelectorAll<HTMLButtonElement>('button[data-tool]')) {
    button.classList.toggle('active', button.dataset.tool === tool)
  }
  magnetismBox.checked = engine.isMagnetismEnabled()
  toolText = `tool: ${tool}`
}

for (const button of toolbar.querySelectorAll<HTMLButtonElement>('button[data-tool]')) {
  button.addEventListener('click', () => {
    try {
      engine.setTool(button.dataset.tool as PlanTool)
    } catch {
      // Unknown tool buttons are a programming error; ignore defensively.
    }
    syncToolbar()
    refreshStatus()
  })
}
magnetismBox.addEventListener('change', () => {
  engine.setMagnetism(magnetismBox.checked)
})

// --- Canvas input (screen px -> model cm) ----------------------------------

interface PointerState {
  down: boolean
  startX: number
  startY: number
  lastX: number
  lastY: number
  moved: boolean
  shift: boolean
}
const pointer: PointerState = {
  down: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  moved: false,
  shift: false,
}

function eventModelPoint(event: PointerEvent | MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const px = (event.clientX - rect.left) * scaleX
  const py = (event.clientY - rect.top) * scaleY
  const view = fitToBounds(store.getHome(), canvas.width, canvas.height)
  return new ViewMapper(view).toModel(px, py)
}

canvas.addEventListener('pointerdown', (event) => {
  if (!ctx || event.button !== 0) return
  canvas.setPointerCapture(event.pointerId)
  const point = eventModelPoint(event)
  pointer.down = true
  pointer.moved = false
  pointer.shift = event.shiftKey
  pointer.startX = point.x
  pointer.startY = point.y
  pointer.lastX = point.x
  pointer.lastY = point.y
})

canvas.addEventListener('pointermove', (event) => {
  if (!pointer.down) return
  const point = eventModelPoint(event)
  const dxPx = Math.abs(point.x - pointer.startX)
  const dyPx = Math.abs(point.y - pointer.startY)
  if (dxPx > 2 || dyPx > 2) pointer.moved = true
  pointer.lastX = point.x
  pointer.lastY = point.y
})

canvas.addEventListener('pointerup', (event) => {
  if (!pointer.down) return
  pointer.down = false
  const point = eventModelPoint(event)
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
  syncToolbar()
  refreshStatus()
})

canvas.addEventListener('dblclick', (event) => {
  const point = eventModelPoint(event)
  engine.click({ x: point.x, y: point.y, dbl: true, shift: event.shiftKey })
  syncToolbar()
  refreshStatus()
})

window.addEventListener('keydown', (event) => {
  let key: 'escape' | 'delete' | 'backspace' | null = null
  if (event.key === 'Escape') key = 'escape'
  else if (event.key === 'Delete') key = 'delete'
  else if (event.key === 'Backspace') key = 'backspace'
  if (key === null) return
  event.preventDefault()
  engine.key(key)
  syncToolbar()
  refreshStatus()
})

// --- Render loop ------------------------------------------------------------

function render(): void {
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const home = store.getHome()
  const preview: PlanPreview | null = engine.getPreview()
  const view = fitToBounds(store.getHome(), canvas.width, canvas.height)
  const rc = ctx as unknown as PlanRenderingContext
  drawPlan(home, preview, rc, view)
}

function frame(): void {
  render()
  requestAnimationFrame(frame)
}

function resizeCanvas(): void {
  const width = canvas.parentElement?.clientWidth ?? 960
  canvas.width = Math.max(320, Math.floor(width))
  canvas.height = 560
}

resizeCanvas()
window.addEventListener('resize', resizeCanvas)
syncToolbar()
refreshStatus()
requestAnimationFrame(frame)

// The 3D view observes the same store.
new View3D(store, { container: root.querySelector<HTMLDivElement>('#view3d')! })

// Automation wiring: orchestrator port via ?automationPort= (browser/dev seam)
// or the HOMELY_AUTOMATION_PORT env of the tauri process (launch recipe).
async function connectAutomation(): Promise<void> {
  const queryPort = automationPortFromSearch(window.location.search)
  let port = queryPort
  if (port === null && '__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core')
    const raw = await invoke<string | null>('automation_port')
    port = raw === null ? null : Number(raw)
  }
  if (port !== null) {
    new AutomationClient(new HomelyCommandHandler(store, { planEngine: engine }), {
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
