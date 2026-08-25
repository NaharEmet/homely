import type { NormalizedHomeState } from './home'
import type { CompassState, EnvironmentState } from './home'

/**
 * Deterministic wire-format export (docs/specs/ws-protocol.md determinism
 * rules): centimeter lengths and degree angles are rounded half-even to 3
 * decimals; degree angles normalized to (-180, 180]; arcExtent,
 * latitudeRad and longitudeRad stay untouched radians.
 */

export function roundHalfEven(value: number, decimals = 3): number {
  if (!Number.isFinite(value)) return value
  const factor = 10 ** decimals
  const scaled = value * factor
  const floor = Math.floor(scaled)
  const diff = scaled - floor
  let rounded: number
  if (diff > 0.5) rounded = floor + 1
  else if (diff < 0.5) rounded = floor
  else rounded = floor % 2 === 0 ? floor : floor + 1
  return rounded / factor
}

/** Normalize degrees into (-180, 180] (180 stays 180, -180 wraps to 180). */
export function normalizeAngle(deg: number): number {
  if (!Number.isFinite(deg)) return deg
  let n = ((deg % 360) + 360) % 360
  if (n > 180) n -= 360
  return n
}

const roundLen = (v: number): number => roundHalfEven(v)
const roundAngle = (v: number | undefined): number | undefined =>
  v === undefined ? undefined : roundHalfEven(normalizeAngle(v))

function roundPoint([x, y]: [number, number]): [number, number] {
  return [roundLen(x), roundLen(y)]
}

/**
 * Produce the canonical export object. Input is never mutated. The output is
 * plain JSON-safe data with identical shape to NormalizedHomeState.
 */
export function serializeHome(home: NormalizedHomeState): NormalizedHomeState {
  return {
    ...home,
    levels: home.levels.map((level) => ({
      ...level,
      elevation: roundLen(level.elevation),
      floorThickness: roundLen(level.floorThickness),
      height: roundLen(level.height),
    })),
    walls: home.walls.map((wall) => ({
      ...wall,
      xStart: roundLen(wall.xStart),
      yStart: roundLen(wall.yStart),
      xEnd: roundLen(wall.xEnd),
      yEnd: roundLen(wall.yEnd),
      thickness: roundLen(wall.thickness),
      height: wall.height === null || wall.height === undefined ? wall.height : roundLen(wall.height),
      heightAtEnd:
        wall.heightAtEnd === null || wall.heightAtEnd === undefined
          ? wall.heightAtEnd
          : roundLen(wall.heightAtEnd),
      // arcExtent stays raw radians by contract
    })),
    rooms: home.rooms.map((room) => ({
      ...room,
      points: room.points.map(roundPoint),
    })),
    furniture: home.furniture.map((f) => ({
      ...f,
      x: roundLen(f.x),
      y: roundLen(f.y),
      elevation: roundLen(f.elevation),
      width: roundLen(f.width),
      depth: roundLen(f.depth),
      height: roundLen(f.height),
      angleDeg: roundAngle(f.angleDeg)!,
      pitchDeg: f.pitchDeg === undefined ? undefined : roundHalfEven(f.pitchDeg),
      rollDeg: f.rollDeg === undefined ? undefined : roundHalfEven(f.rollDeg),
      modelRotationDeg: f.modelRotationDeg?.map((triple) => triple.map(roundHalfEven) as [number, number, number]),
    })),
    dimensionLines: home.dimensionLines.map((d) => ({
      ...d,
      xStart: roundLen(d.xStart),
      yStart: roundLen(d.yStart),
      xEnd: roundLen(d.xEnd),
      yEnd: roundLen(d.yEnd),
      offset: roundLen(d.offset),
      elevationStart: d.elevationStart === undefined ? undefined : roundLen(d.elevationStart),
      elevationEnd: d.elevationEnd === undefined ? undefined : roundLen(d.elevationEnd),
    })),
    labels: home.labels.map((label) => ({
      ...label,
      x: roundLen(label.x),
      y: roundLen(label.y),
      angleDeg: label.angleDeg === undefined ? undefined : roundAngle(label.angleDeg),
      elevation: label.elevation === undefined ? undefined : roundLen(label.elevation),
    })),
    cameras: {
      top: {
        ...home.cameras.top,
        x: roundLen(home.cameras.top.x),
        y: roundLen(home.cameras.top.y),
        z: roundLen(home.cameras.top.z),
        yawDeg: roundAngle(home.cameras.top.yawDeg)!,
        pitchDeg: roundAngle(home.cameras.top.pitchDeg)!,
        fovDeg: roundAngle(home.cameras.top.fovDeg)!,
      },
      observer: {
        ...home.cameras.observer,
        x: roundLen(home.cameras.observer.x),
        y: roundLen(home.cameras.observer.y),
        z: roundLen(home.cameras.observer.z),
        yawDeg: roundAngle(home.cameras.observer.yawDeg)!,
        pitchDeg: roundAngle(home.cameras.observer.pitchDeg)!,
        fovDeg: roundAngle(home.cameras.observer.fovDeg)!,
      },
    },
    compass: serializeCompass(home.compass),
    environment: serializeEnvironment(home.environment),
  }
}

function serializeCompass(compass: CompassState): CompassState {
  return {
    ...compass,
    x: roundLen(compass.x),
    y: roundLen(compass.y),
    diameter: roundLen(compass.diameter),
    northDirectionDeg: roundAngle(compass.northDirectionDeg)!,
    // latitudeRad/longitudeRad stay raw radians by contract
  }
}

function serializeEnvironment(environment: EnvironmentState): EnvironmentState {
  return {
    ...environment,
    wallsAlpha:
      environment.wallsAlpha === null || environment.wallsAlpha === undefined
        ? environment.wallsAlpha
        : roundHalfEven(environment.wallsAlpha),
  }
}
