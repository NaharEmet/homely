import type { HomeStore } from '../core/store'
import { serializeHome } from '../core/export'
import { HomeModel, ModelError, assert } from '../core/model'
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
        // Frozen protocol shape is {catalogId,x,y,angleDeg?}; the clone has no
        // catalog service yet, so dimensions must be supplied inline until a
        // later ticket (deviation documented in docs/behaviours/).
        const nameParam = params.name
        assert(
          typeof nameParam === 'string' && nameParam.length > 0,
          'param name must be a non-empty string',
        )
        const catalogId = params.catalogId ?? null
        assert(catalogId === null || typeof catalogId === 'string', 'param catalogId must be a string')
        const furniture = this.model.addFurniture({
          name: nameParam,
          catalogId,
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
        this.store.undo()
        return { ok: true, data: { canUndo: this.store.canUndo(), canRedo: this.store.canRedo() } }
      }
      case 'redo': {
        this.store.redo()
        return { ok: true, data: { canUndo: this.store.canUndo(), canRedo: this.store.canRedo() } }
      }
      default:
        return { ok: false, error: `unknown command: ${type}`, code: 'UNKNOWN_COMMAND' }
    }
  }
}
