import type { HomeStore } from '../core/store'
import { serializeHome } from '../core/export'
import { HomeModel, ModelError, assert } from '../core/model'
import type { CameraPatch } from '../view3d/cameras'
import { CameraDirector } from '../view3d/cameras'
import { PlanEngine, type ClickInput, type DragInput, type PlanKey, type PlanTool } from '../plan/engine'
import { CaptureService, type CaptureBackend } from './capture'
import type { CommandHandler, CommandResult } from './client'
import { FurnitureCatalog } from '../core/catalog'
import { resolvePlacement, toWireItem } from '../core/catalog-service'

const COMMANDS = [
  'ping',
  'new_home',
  'get_state',
  'get_capabilities',
  'add_furniture',
  'catalog_add_furniture',
  'list_catalog',
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
  private readonly catalog: FurnitureCatalog | null

  constructor(
    store: HomeStore,
    options?: {
      planEngine?: PlanEngine
      captureBackend?: CaptureBackend
      /** Injectable catalog; omit for inline-only add_furniture (back-compat). */
      catalog?: FurnitureCatalog | null
    },
  ) {
    this.store = store
    const model = new HomeModel(store)
    this.model = model
    this.cameras = new CameraDirector(store, model)
    // The GUI passes its engine so UI input and automation share one tool
    // state machine; headless use lazily creates a private one.
    this.plan = options?.planEngine ?? new PlanEngine(model)
    this.capture = new CaptureService(store, this.cameras, options?.captureBackend)
    this.catalog = options?.catalog ?? null
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
        // Frozen protocol shape is {catalogId,x,y,angleDeg?}; dimensions may be
        // resolved from the loaded catalog (when present) OR supplied inline
        // (back-compat with the pre-catalog deviation, documented in
        // docs/behaviours/sh3d-plan-tool-behaviours.md).
        const catalogId = params.catalogId ?? null
        assert(catalogId === null || typeof catalogId === 'string', 'param catalogId must be a string')

        let name: string
        let width: number
        let depth: number
        let height: number
        let elevation = params.elevation === undefined ? 0 : requireNumber(params, 'elevation')
        let color: number | null = null
        let doorOrWindow = false

        if (catalogId !== null && this.catalog) {
          const resolved = resolvePlacement(this.catalog, catalogId)
          name = resolved.name
          width = resolved.width
          depth = resolved.depth
          height = resolved.height
          if (params.elevation === undefined) elevation = resolved.elevation!
          color = resolved.color ?? null
          doorOrWindow = resolved.doorOrWindow ?? false
        } else {
          const nameParam = params.name
          assert(
            typeof nameParam === 'string' && nameParam.length > 0,
            'param name must be a non-empty string',
          )
          name = nameParam
          width = requireNumber(params, 'width')
          depth = requireNumber(params, 'depth')
          height = requireNumber(params, 'height')
        }

        const furniture = this.model.addFurniture({
          name,
          catalogId,
          x: requireNumber(params, 'x'),
          y: requireNumber(params, 'y'),
          angleDeg: params.angleDeg === undefined ? 0 : requireNumber(params, 'angleDeg'),
          width,
          depth,
          height,
          elevation,
          color,
          doorOrWindow,
        })
        return { ok: true, data: { id: furniture.id } }
      }
      case 'catalog_add_furniture': {
        // Catalog-driven placement: dims resolved from the manifest, not inline.
        // Wire shape mirrors ws-protocol.md:79 {catalogId,x,y,angleDeg?}.
        if (!this.catalog) {
          return {
            ok: false,
            error: 'catalog_add_furniture requires a loaded catalog',
            code: 'INVALID_REQUEST',
          }
        }
        const catalogId = params.catalogId
        assert(typeof catalogId === 'string' && catalogId.length > 0, 'param catalogId must be a non-empty string')
        const resolved = resolvePlacement(this.catalog, catalogId)
        const furniture = this.model.addFurniture({
          name: resolved.name,
          catalogId: resolved.catalogId,
          x: requireNumber(params, 'x'),
          y: requireNumber(params, 'y'),
          angleDeg: params.angleDeg === undefined ? 0 : requireNumber(params, 'angleDeg'),
          width: resolved.width,
          depth: resolved.depth,
          height: resolved.height,
          elevation: params.elevation === undefined ? resolved.elevation! : requireNumber(params, 'elevation'),
          color: resolved.color ?? null,
          doorOrWindow: resolved.doorOrWindow ?? false,
        })
        return { ok: true, data: { id: furniture.id } }
      }
      case 'list_catalog': {
        // ws-protocol.md:80 — {items:[{catalogId,name,width,depth,height,doorOrWindow}]}
        if (!this.catalog) {
          return {
            ok: false,
            error: 'list_catalog requires a loaded catalog',
            code: 'INVALID_REQUEST',
          }
        }
        return { ok: true, data: { items: this.catalog.list().map(toWireItem) } }
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
