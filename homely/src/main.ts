import './style.css'
import { AutomationClient, automationPortFromSearch } from './automation/client'
import { HomeStore } from './core/store'
import { HomelyCommandHandler } from './automation/homely-handler'
import { PlanEngine, type PlanTool } from './plan/engine'
import { ViewMapper, drawPlan, fitToBounds } from './plan/renderer'
import type { PlanRenderingContext } from './plan/renderer'

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
    <canvas id="plan-canvas" width="960" height="560"></canvas>
    <div id="view3d"></div>
  </main>
`
const statusEl = root.querySelector<HTMLParagraphElement>('#status')!

function setStatus(text: string): void {
  statusEl.textContent = text
}

// One store + one plan engine shared by the UI and the automation bridge.
const store = new HomeStore()
const model = undefined as unknown as ConstructorParameters<typeof HomelyCommandHandler>[0]
void model
const engine = new PlanEngine(new (Object.getPrototypeOf(HomelyCommandHandler) ? never : never)())
void engine

export {}
