import type { HomeStore } from '../core/store'
import { serializeHome } from '../core/export'
import { HomeModel, ModelError } from '../core/model'
import type { CommandHandler, CommandResult } from './client'

const COMMANDS = [
  'ping',
  'new_home',
  'get_state',
  'get_capabilities',
  'add_furniture',
  'undo',
  'redo',
] as const

function requireNumber(params: Record<string, unknown>, field: string): number {
  const value = params[field]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ModelError(`param ${field} must be a finite number`)
  }
  return value
}

/** Answers the Wave-1 command subset of docs/specs/ws-protocol.md v1. */
export class HomelyCommandHandler implements CommandHandler {
  readonly commands = COMMANDS

  private readonly model: HomeModel

  constructor(private readonly store: HomeStore) {
    this.model = new HomeModel(store)
  }

  execute(type: string, params: Record<string, unknown>): CommandResult {
    try {
      return this.dispatch(type, params)
    } catch (err) {
      if (err instanceof ModelError) {
        return { ok: false, error: err.message, code: 'INVALID_PARAMS' }
      }
      throw err
    }
  }

  private dispatch(type: string, params: Record<string, unknown>): CommandResult {
    switch (type) {
      case 'ping':
        return { ok: true, data: { pong: true } }
      case 'new_home':
        this.store.resetToEmpty()
        return { ok: true, data: {} }
      case 'get_state':
        return { ok: true, data: serializeHome(this.store.getHome()) }
      case 'get_capabilities':
        return { ok: true, data: { commands: [...this.commands] } }
      case 'add_furniture': {
        const furniture = this.model.addFurniture({
          name: String(params.name ?? ''),
          x: requireNumber(params, 'x'),
          y: requireNumber(params, 'y'),
          angleDeg: params.angleDeg === undefined ? 0 : requireNumber(params, 'angleDeg'),
          width: requireNumber(params, 'width'),
          depth: requireNumber(params, 'depth'),
          height: requireNumber(params, 'height'),
          elevation: params.elevation === undefined ? 0 : requireNumber(params, 'elevation'),
        })
        return { ok: true, data: { id: furniture.id } }
      }
      case 'undo': {
        const undone = this.store.undo()
        return { ok: true, data: { undone, canUndo: this.store.canUndo(), canRedo: this.store.canRedo() } }
      }
      case 'redo': {
        const redone = this.store.redo()
        return { ok: true, data: { redone, canUndo: this.store.canUndo(), canRedo: this.store.canRedo() } }
      }
      default:
        return { ok: false, error: `unknown command: ${type}`, code: 'UNKNOWN_COMMAND' }
    }
  }
}
