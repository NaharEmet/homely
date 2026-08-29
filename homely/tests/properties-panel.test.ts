import { describe, expect, it } from 'vitest'
import { validateFinite, validatePositive } from '../src/ui/properties-panel'
import { normalizeAngle } from '../src/core/export'
import { HomeModel } from '../src/core/model'
import { HomeStore } from '../src/core/store'

describe('validatePositive', () => {
  it('accepts values at or above the minimum', () => {
    expect(validatePositive('42', 1)).toBe(42)
    expect(validatePositive('0.1', 1, 0.1)).toBe(0.1)
    expect(validatePositive('12.5', 7, 1)).toBe(12.5)
  })

  it('rejects below-minimum values and returns the fallback', () => {
    expect(validatePositive('0', 1)).toBe(1)
    expect(validatePositive('-5', 7, 1)).toBe(7)
    expect(validatePositive('0.05', 2, 0.1)).toBe(2)
  })

  it('rejects empty, non-numeric, and non-finite input', () => {
    expect(validatePositive('', 1)).toBe(1)
    expect(validatePositive('abc', 1)).toBe(1)
    expect(validatePositive('NaN', 1)).toBe(1)
    expect(validatePositive('Infinity', 1)).toBe(1)
  })

  it('parses leading numbers but rejects trailing junk (parseFloat semantics)', () => {
    expect(validatePositive('10cm', 1)).toBe(10)
    expect(validatePositive('  3.5  ', 1)).toBe(3.5)
  })
})

describe('validateFinite', () => {
  it('accepts any finite number including negatives and zero', () => {
    expect(validateFinite('-123.45', 0)).toBe(-123.45)
    expect(validateFinite('0', 99)).toBe(0)
    expect(validateFinite('3.5', 0)).toBe(3.5)
  })

  it('rejects empty, non-numeric, and non-finite input with the fallback', () => {
    expect(validateFinite('', 7)).toBe(7)
    expect(validateFinite('abc', 7)).toBe(7)
    expect(validateFinite('NaN', 7)).toBe(7)
    expect(validateFinite('Infinity', 7)).toBe(7)
  })

  it('keeps the fallback the model already holds on invalid input', () => {
    // The panel passes the current model value as fallback, so an invalid
    // edit must leave the underlying value untouched.
    const currentX = 120.5
    expect(validateFinite('garbage', currentX)).toBe(currentX)
    expect(validatePositive('-1', currentX)).toBe(currentX)
  })
})

describe('normalizeAngle (furniture angle handler)', () => {
  it('wraps out-of-range degrees into [-180, 180)', () => {
    expect(normalizeAngle(270)).toBe(-90)
    expect(normalizeAngle(180)).toBe(-180)
    expect(normalizeAngle(-270)).toBe(90)
    expect(normalizeAngle(720)).toBe(0)
    expect(normalizeAngle(45.5)).toBe(45.5)
  })

  it('composes with validateFinite like the change handler does', () => {
    const fallback = 30
    const raw = '370'
    const n = validateFinite(raw, fallback)
    expect(normalizeAngle(n)).toBe(10)
    // invalid text falls back to the current angle, then normalizes idempotently
    const bad = validateFinite('oops', fallback)
    expect(normalizeAngle(bad)).toBe(30)
  })
})

describe('invalid panel input never reaches the model', () => {
  it('an invalid dimension commit keeps the furniture unchanged', () => {
    const store = new HomeStore()
    const model = new HomeModel(store)
    const f = model.addFurniture({ name: 'table', x: 10, y: 10, angleDeg: 0, width: 100, depth: 60, height: 75, elevation: 5 })
    const before = store.getHome().furniture[0]!
    // Mirrors the width change handler: fallback is the current model value
    // (num(f.width, 1)), so '', 'abc', and '-3' all commit the current value.
    for (const raw of ['', 'abc', '-3']) {
      const current = store.getHome().furniture[0]!.width ?? 1
      const n = validatePositive(raw, current)
      model.updateFurniture(f.id, { width: n })
    }
    const after = store.getHome().furniture[0]!
    expect(after.width).toBe(before.width)
    expect(after.width).toBe(100)
  })

  it('an invalid position or angle commit keeps the furniture unchanged', () => {
    const store = new HomeStore()
    const model = new HomeModel(store)
    const f = model.addFurniture({ name: 'chair', x: 120.5, y: -10, angleDeg: 30, width: 40, depth: 40, height: 80, elevation: 5 })
    const before = store.getHome().furniture[0]!
    const invalidInputs = ['', 'not-a-number', 'NaN', 'Infinity']
    for (const raw of invalidInputs) {
      const x = validateFinite(raw, store.getHome().furniture[0]!.x ?? 0)
      const angle = normalizeAngle(validateFinite(raw, store.getHome().furniture[0]!.angleDeg ?? 0))
      model.updateFurniture(f.id, { x, angleDeg: angle })
    }
    const after = store.getHome().furniture[0]!
    expect(after.x).toBe(before.x)
    expect(after.angleDeg).toBe(before.angleDeg)
  })
})
