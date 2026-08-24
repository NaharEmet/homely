import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  AutomationClient,
  automationPortFromEnv,
  automationPortFromSearch,
} from '../src/automation/client'
import { HomelyCommandHandler } from '../src/automation/homely-handler'
import { createEmptyHome } from '../src/core/home'
import { HomeStore } from '../src/core/store'
import type { NormalizedHomeState } from '../src/core/home'
import { MockOrchestrator } from '../src/dev/mock-orchestrator'

let orch: MockOrchestrator
let store: HomeStore
let client: AutomationClient

beforeAll(async () => {
  orch = new MockOrchestrator()
  const port = await orch.start()
  store = new HomeStore()
  client = new AutomationClient(new HomelyCommandHandler(store), {
    port,
    mode: 'test',
  })
})

afterAll(async () => {
  client.close()
  await orch.close()
})

async function awaitHello(): Promise<void> {
  await vi.waitFor(
    () => {
      if (!orch.hello) throw new Error('no hello yet')
    },
    { timeout: 2000, interval: 20 },
  )
}

describe('ws protocol v1 handshake', () => {
  it('sends hello as the first message', async () => {
    await awaitHello()
    expect(orch.hello).toEqual({
      type: 'hello',
      app: 'homely',
      version: 1,
      mode: 'test',
    })
  })

  it('answers ping with pong', async () => {
    await awaitHello()
    const res = await orch.sendRequest('ping')
    expect(res).toMatchObject({ ok: true, data: { pong: true } })
  })

  it('get_state returns the schema-conformant empty home', async () => {
    await awaitHello()
    const res = await orch.sendRequest('get_state')
    expect(res.ok).toBe(true)
    const home = res.data as NormalizedHomeState
    // Required top-level keys per docs/schema/home-project.schema.json v1
    expect(Object.keys(home)).toEqual(
      expect.arrayContaining([
        'schemaVersion',
        'levels',
        'walls',
        'rooms',
        'furniture',
        'dimensionLines',
        'labels',
        'selection',
        'cameras',
        'capabilities',
      ]),
    )
    expect(home.schemaVersion).toBe(1)
    // SH3D 7.5 empty-home ground truth
    expect(home.levels).toEqual([])
    expect(home.cameras.top).toEqual({
      x: 50,
      y: 1050,
      z: 1010,
      yawDeg: 180,
      pitchDeg: 45,
      fovDeg: 63,
      lens: 'PINHOLE',
    })
    expect(home.cameras.observer).toEqual({
      x: 50,
      y: 50,
      z: 170,
      yawDeg: 315,
      pitchDeg: 11.25,
      fovDeg: 63,
      lens: 'PINHOLE',
    })
    expect(home.compass).toEqual({
      x: -100,
      y: 50,
      diameter: 100,
      northDirectionDeg: 0,
      latitudeRad: 0,
      longitudeRad: 0,
      visible: true,
    })
    expect(home.environment).toEqual({
      skyColor: 0xcce4fc,
      groundColor: 0xa8a8a8,
      lightColor: 0xd0d0d0,
      wallsAlpha: 1,
    })
    expect(home.capabilities).toEqual({ canUndo: false, canRedo: false })
  })

  it('new_home resets state and clears undo stack', async () => {
    await awaitHello()
    const res = await orch.sendRequest('new_home')
    expect(res).toMatchObject({ ok: true, data: {} })
    expect(store.getHome()).toEqual(createEmptyHome())
    expect(store.canUndo()).toBe(false)
  })

  it('reports implemented commands via get_capabilities', async () => {
    await awaitHello()
    const res = await orch.sendRequest('get_capabilities')
    expect(res).toMatchObject({
      ok: true,
      data: { commands: ['ping', 'new_home', 'get_state', 'get_capabilities'] },
    })
  })

  it('rejects unknown commands with a code', async () => {
    await awaitHello()
    const res = await orch.sendRequest('add_furniture', { catalogId: 'x' })
    expect(res.ok).toBe(false)
    expect(res.code).toBe('UNKNOWN_COMMAND')
    expect(typeof res.error).toBe('string')
  })

  it('matches responses to ids under concurrent requests', async () => {
    await awaitHello()
    const [p1, p2] = [orch.sendRequest('ping'), orch.sendRequest('ping')]
    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1.id).not.toBe(r2.id)
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
  })

  it('ignores malformed frames instead of crashing', async () => {
    await awaitHello()
    const res = await orch.sendRequest('ping')
    expect(res.ok).toBe(true)
  })
})

describe('port seams', () => {
  it('parses HOMELY_AUTOMATION_PORT', () => {
    expect(automationPortFromEnv({ HOMELY_AUTOMATION_PORT: '8765' })).toBe(8765)
    expect(automationPortFromEnv({})).toBeNull()
    expect(automationPortFromEnv({ HOMELY_AUTOMATION_PORT: 'nope' })).toBeNull()
    expect(automationPortFromEnv({ HOMELY_AUTOMATION_PORT: '-1' })).toBeNull()
  })

  it('parses ?automationPort=', () => {
    expect(automationPortFromSearch('?automationPort=1234&x=1')).toBe(1234)
    expect(automationPortFromSearch('?x=1')).toBeNull()
    expect(automationPortFromSearch('?automationPort=abc')).toBeNull()
  })
})
