/**
 * Normalized home state (schemaVersion 1) mirroring docs/schema/home-project.schema.json.
 * Lengths are centimeters, angles degrees normalized to (-180, 180] unless suffixed
 * otherwise (arcExtent stays radians, latitudeRad/longitudeRad radians).
 */

export const SCHEMA_VERSION = 1

/** Default wall height in cm (SH3D UserPreferences default). */
export const DEFAULT_WALL_HEIGHT_CM = 250

export type LensName = 'PINHOLE' | 'NORMAL' | 'FISHEYE' | 'SPHERICAL'

export type ActiveTool =
  | null
  | 'selection'
  | 'panning'
  | 'wall'
  | 'room'
  | 'polyline'
  | 'dimensionLine'
  | 'label'

export interface Level {
  id: string
  name: string
  elevation: number
  floorThickness: number
  height: number
  visible: boolean
  viewable: boolean
}

export interface Wall {
  id: string
  xStart: number
  yStart: number
  xEnd: number
  yEnd: number
  thickness: number
  /** Radians, positive = counterclockwise bulge. Absent/null for straight walls. */
  arcExtent?: number | null
  height?: number | null
  heightAtEnd?: number | null
  levelRef?: string | null
  leftSideColor?: number | null
  rightSideColor?: number | null
  patternId?: string | null
}

export interface Room {
  id: string
  points: Array<[number, number]>
  name?: string | null
  areaVisible?: boolean
  floorVisible?: boolean
  floorColor?: number | null
  ceilingVisible?: boolean
  levelRef?: string | null
}

export interface Furniture {
  id: string
  name: string
  x: number
  y: number
  angleDeg: number
  width: number
  depth: number
  height: number
  elevation: number
  catalogId?: string | null
  pitchDeg?: number
  rollDeg?: number
  color?: number | null
  visible?: boolean
  movable?: boolean
  doorOrWindow?: boolean
  /** Up to three [xDeg, yDeg, zDeg] rotation triples (schema modelRotationDeg). */
  modelRotationDeg?: Array<[number, number, number]>
  levelRef?: string | null
}

export interface DimensionLine {
  id: string
  xStart: number
  yStart: number
  xEnd: number
  yEnd: number
  offset: number
  elevationStart?: number
  elevationEnd?: number
  levelRef?: string | null
}

export interface Label {
  id: string
  text: string
  x: number
  y: number
  angleDeg?: number
  elevation?: number
  color?: number | null
  levelRef?: string | null
}

export interface CameraState {
  x: number
  y: number
  z: number
  yawDeg: number
  pitchDeg: number
  fovDeg: number
  lens: LensName
}

export interface ObserverCameraState extends CameraState {
  fixedSize?: boolean
}

export interface CamerasState {
  top: CameraState
  observer: ObserverCameraState
}

export interface CompassState {
  x: number
  y: number
  diameter: number
  northDirectionDeg: number
  latitudeRad: number
  longitudeRad: number
  visible: boolean
}

export interface EnvironmentState {
  skyColor: number | null
  groundColor: number | null
  lightColor: number | null
  /** 0..1; 1 = fully opaque walls in 3D view. */
  wallsAlpha: number | null
}

export interface CapabilitiesState {
  canUndo: boolean
  canRedo: boolean
}

export interface NormalizedHomeState {
  schemaVersion: typeof SCHEMA_VERSION
  name?: string
  levels: Level[]
  walls: Wall[]
  rooms: Room[]
  furniture: Furniture[]
  dimensionLines: DimensionLine[]
  labels: Label[]
  selection: string[]
  cameras: CamerasState
  compass: CompassState
  environment: EnvironmentState
  activeTool: ActiveTool
  capabilities: CapabilitiesState
}

/**
 * A truly empty Sweet Home 3D 7.5 home: no levels (created on demand),
 * default top/observer cameras, visible compass at (-100, 50) d=100,
 * gray ground / blue sky / light-gray light, opaque walls.
 */
export function createEmptyHome(): NormalizedHomeState {
  return {
    schemaVersion: SCHEMA_VERSION,
    levels: [],
    walls: [],
    rooms: [],
    furniture: [],
    dimensionLines: [],
    labels: [],
    selection: [],
    cameras: {
      top: { x: 50, y: 1050, z: 1010, yawDeg: 180, pitchDeg: 45, fovDeg: 63, lens: 'PINHOLE' },
      observer: {
        x: 50,
        y: 50,
        z: 170,
        yawDeg: 315,
        pitchDeg: 11.25,
        fovDeg: 63,
        lens: 'PINHOLE',
      },
    },
    compass: {
      x: -100,
      y: 50,
      diameter: 100,
      northDirectionDeg: 0,
      latitudeRad: 0,
      longitudeRad: 0,
      visible: true,
    },
    environment: {
      skyColor: 0xcce4fc,
      groundColor: 0xa8a8a8,
      lightColor: 0xd0d0d0,
      wallsAlpha: 1,
    },
    activeTool: null,
    capabilities: { canUndo: false, canRedo: false },
  }
}
