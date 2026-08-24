import type { NormalizedHomeState } from '../core/home'

export const PROTOCOL_VERSION = 1

export interface HelloMessage {
  type: 'hello'
  app: 'homely'
  version: number
  mode: string
}

export interface AutomationRequest {
  id: string
  type: string
  params?: Record<string, unknown>
}

export type CommandResult = { ok: true; data: unknown } | { ok: false; error: string; code: string }

/** The set of command types this client answers, implemented by HomelyCommandHandler. */
export interface CommandHandler {
  readonly commands: readonly string[]
  execute(type: string, params: Record<string, unknown>): Promise<CommandResult> | CommandResult
}

export type ClientStatus = 'connecting' | 'open' | 'closed'

export interface AutomationClientOptions {
  /** Orchestrator port (env HOMELY_AUTOMATION_PORT upstream). Ignored when url is set. */
  port?: number
  /** Full ws:// URL override. */
  url?: string
  /** Reported in hello; e.g. "gui" or "headless". */
  mode?: string
  onStatus?: (status: ClientStatus) => void
}

/**
 * Browser WebSocket client that connects OUT to the orchestrator
 * (docs/specs/ws-protocol.md v1): hello first, then exactly one response
 * per request. Messages are newline-delimited JSON.
 */
export class AutomationClient {
  private readonly ws: WebSocket

  constructor(
    private readonly handler: CommandHandler,
    options: AutomationClientOptions,
  ) {
    const url =
      options.url ?? `ws://127.0.0.1:${options.port ?? automationPortFromEnv() ?? 0}`
    if (!/^ws:\/\/127\.0\.0\.1:\d+$/.test(url)) {
      throw new Error(`invalid orchestrator URL: ${url}`)
    }
    this.ws = new WebSocket(url)
    options.onStatus?.('connecting')
    this.ws.addEventListener('open', () => {
      options.onStatus?.('open')
      this.send(hello(options.mode ?? 'gui'))
    })
    this.ws.addEventListener('message', (event) => {
      void this.handleFrame(String(event.data))
    })
    this.ws.addEventListener('close', () => options.onStatus?.('closed'))
    this.ws.addEventListener('error', () => options.onStatus?.('closed'))
  }

  close(): void {
    this.ws.close()
  }

  private send(value: unknown): void {
    this.ws.send(JSON.stringify(value) + '\n')
  }

  private async handleFrame(frame: string): Promise<void> {
    for (const line of frame.split('\n')) {
      if (!line.trim()) continue
      let msg: unknown
      try {
        msg = JSON.parse(line)
      } catch {
        continue
      }
      await this.handleMessage(msg)
    }
  }

  private async handleMessage(msg: unknown): Promise<void> {
    if (!isRequest(msg)) return
    let result: CommandResult
    try {
      result = await this.handler.execute(msg.type, msg.params ?? {})
    } catch (err) {
      result = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        code: 'INTERNAL',
      }
    }
    this.send(result.ok ? { id: msg.id, ok: true, data: result.data } : { id: msg.id, ...result })
  }
}

function isRequest(msg: unknown): msg is Required<AutomationRequest> {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    typeof (msg as AutomationRequest).id === 'string' &&
    typeof (msg as AutomationRequest).type === 'string'
  )
}

export function hello(mode: string): HelloMessage {
  return { type: 'hello', app: 'homely', version: PROTOCOL_VERSION, mode }
}

/** Parse HOMELY_AUTOMATION_PORT from an env-like record (pure; testable). */
export function automationPortFromEnv(env: Record<string, string | undefined> = {}): number | null {
  const raw = env.HOMELY_AUTOMATION_PORT ?? process.env.HOMELY_AUTOMATION_PORT
  const port = raw === undefined ? NaN : Number(raw)
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : null
}

/** Seam for GUI launch: orchestrator may pass the port via query string. */
export function automationPortFromSearch(search: string): number | null {
  const raw = new URLSearchParams(search).get('automationPort')
  const port = raw === null ? NaN : Number(raw)
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : null
}

export type { NormalizedHomeState }
