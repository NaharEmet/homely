import type { HomeStore } from '../core/store'
import { serializeHome } from '../core/export'
import { HomeModel, ModelError, assert } from '../core/model'
import type { CameraPatch } from '../view3d/cameras'
import { CameraDirector } from '../view3d/cameras'
import { PlanEngine, type ClickInput, type DragInput, type PlanKey, type PlanTool } from '../plan/engine'
import { CaptureService, type CaptureBackend } from './capture'
import type { CommandHandler, CommandResult } from './client'

const COMMANDS = [
  'ping',
  'new_home',
  'get_state',
  'get_capabilities',
  'add_furniture',
  'undo',
  'redo',
  'set_camera',
  'camera_preset',
  'select_tool',
  'click',
  'drag',
  'key',
  'set_magnetism',
  'screenshot',
] as const

const CAMERA_FIELDS = ['x', 'y', 'z', 'yawDeg', 'pitchDeg', 'fovDeg'] as const

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

  private readonly store: HomeStore
  private readonly model: HomeModel
  private readonly cameras: CameraDirector
  private readonly plan: PlanEngine
  private readonly capture: CaptureService

  constructor(
    store: HomeStore,
    options?: { planEngine?: PlanEngine; captureBackend?: CaptureBackend },
  ) {
    this.store = store
    const model = new HomeModel(store)
    this.model = model
    this.cameras = new CameraDirector(store, model)
    // The GUI passes its engine so UI input and automation share one tool
    // state machine; headless use lazily creates a private one.
    this.plan = options?.planEngine ?? new PlanEngine(model)
    this.capture = new CaptureService(store, this.cameras, options?.captureBackend)
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
      case 'set_camera': {
        const patch: CameraPatch = {}
        for (const field of CAMERA_FIELDS) {
          if (params[field] !== undefined) patch[field] = requireNumber(params, field)
        }
        this.cameras.setCamera(patch)
        return { ok: true, data: {} }
      }
      case 'camera_preset': {
        // Frozen shape: {preset:"top"|"observer"} -> {camera:{...}} snapshot.
        const preset = params.preset
        assert(
          preset === 'top' || preset === 'observer',
          'param preset must be "top" or "observer"',
        )
        const camera = this.cameras.usePreset(preset)
        return {
          ok: true,
          data: {
            camera: {
              x: camera.x,
              y: camera.y,
              z: camera.z,
              yawDeg: camera.yawDeg,
              pitchDeg: camera.pitchDeg,
              fovDeg: camera.fovDeg,
            },
          },
        }
      }
      case 'select_tool': {
        const tool = params.tool
        assert(typeof tool === 'string', 'param tool must be a string')
        this.plan.setTool(tool as PlanTool)
        return { ok: true, data: { tool } }
      }
      case 'click':
        this.plan.click(params as unknown as ClickInput)
        return { ok: true, data: {} }
      case 'drag':
        this.plan.drag(params as unknown as DragInput)
        return { ok: true, data: {} }
      case 'key': {
        const key = params.key
        assert(
          key === 'escape' || key === 'delete' || key === 'backspace',
          'param key must be escape|delete|backspace',
        )
        this.plan.key(key as PlanKey)
        return { ok: true, data: {} }
      }
      case 'set_magnetism': {
        this.plan.setMagnetism(params.enabled === true)
        return { ok: true, data: { magnetismEnabled: params.enabled === true } }
      }
      case 'screenshot': {
        const view = params.view
        assert(view === 'plan' || view === '3d', 'param view must be "plan" or "3d"')
        const width = requireNumber(params, 'width')
        const height = requireNumber(params, 'height')
        return {
          ok: true,
          data: this.capture.screenshot({ view, width, height }),
        }
      }
      default:
        return { ok: false, error: `unknown command: ${type}`, code: 'UNKNOWN_COMMAND' }
    }
  }
}
