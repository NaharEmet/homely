import './style.css'
import { AutomationClient, automationPortFromSearch } from './automation/client'
import { HomeStore } from './core/store'
import { HomelyCommandHandler } from './automation/homely-handler'

const root = document.querySelector<HTMLDivElement>('#root')!
root.innerHTML = `
  <main>
    <h1>Homely</h1>
    <p id="status">automation: idle</p>
  </main>
`
const statusEl = root.querySelector<HTMLParagraphElement>('#status')!

function setStatus(text: string): void {
  statusEl.textContent = `automation: ${text}`
}

// B1 seam: the orchestrator passes its port via ?automationPort= (env wiring lands later).
const port = automationPortFromSearch(window.location.search)
if (port !== null) {
  const store = new HomeStore()
  new AutomationClient(new HomelyCommandHandler(store), {
    port,
    mode: 'gui',
    onStatus: setStatus,
  })
} else {
  setStatus('idle (launch with ?automationPort=<port>)')
}
