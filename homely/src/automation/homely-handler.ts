import type { HomeStore } from '../core/store'
import type { CommandHandler, CommandResult } from './client'

/** Answers the B1 command subset of docs/specs/ws-protocol.md v1. */
export class HomelyCommandHandler implements CommandHandler {
  readonly commands = ['ping', 'new_home', 'get_state', 'get_capabilities'] as const

  constructor(private readonly store: HomeStore) {}

  execute(type: string, _params: Record<string, unknown>): CommandResult {
    switch (type) {
      case 'ping':
        return { ok: true, data: { pong: true } }
      case 'new_home':
        this.store.resetToEmpty()
        return { ok: true, data: {} }
      case 'get_state':
        return { ok: true, data: this.store.getHome() }
      case 'get_capabilities':
        return { ok: true, data: { commands: [...this.commands] } }
      default:
        return { ok: false, error: `unknown command: ${type}`, code: 'UNKNOWN_COMMAND' }
    }
  }
}
