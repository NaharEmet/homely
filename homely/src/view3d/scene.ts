import * as THREE from 'three'
import {
  DEFAULT_WALL_HEIGHT_CM,
  type Furniture,
  type NormalizedHomeState,
  type Room,
  type Wall,
} from '../core/home'

export const DEFAULT_WALL_COLOR = 0xd2d2d2
export const DEFAULT_FLOOR_COLOR = 0xc8c8c8
export const DEFAULT_FURNITURE_COLOR = 0x9e9e9e

const GROUND_SIZE_CM = 100_000

/**
 * SH3D world mapping (HomeComponent3D.updateViewPlatformTransform /
 * Wall3D.java): plan coords (x, y) map straight to three.js (x, height, y) —
 * no axis mirroring. Walls yaw directly from atan2(dy, dx); camera yaw is
 * applied as rotation.y = PI - yawDeg by the view layer.
 */

function levelElevationMap(home: NormalizedHomeState): Map<string, number> {
  const elevations = new Map<string, number>()
  for (const level of home.levels) elevations.set(level.id, level.elevation)
  return elevations
}

function elevationFor(ref: string | null | undefined, levels: Map<string, number>): number {
  if (ref === null || ref === undefined) return 0
  return levels.get(ref) ?? 0
}

function wallMesh(wall: Wall, elevation: number, wallsTransparency: number): THREE.Mesh {
  const dx = wall.xEnd - wall.xStart
  const dy = wall.yEnd - wall.yStart
  const length = Math.hypot(dx, dy)
  const height = wall.height ?? DEFAULT_WALL_HEIGHT_CM
  const geometry = new THREE.BoxGeometry(length, height, wall.thickness)
  const material = new THREE.MeshLambertMaterial({ color: wall.leftSideColor ?? DEFAULT_WALL_COLOR })
  // SH3D Wall3D.java:1522 — wallsAlpha is a TRANSPARENCY (0 = opaque).
  if (wallsTransparency > 0) {
    material.transparent = true
    material.opacity = 1 - wallsTransparency
  }
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `wall:${wall.id}`
  mesh.position.set(
    (wall.xStart + wall.xEnd) / 2,
    elevation + height / 2,
    (wall.yStart + wall.yEnd) / 2,
  )
  mesh.rotation.y = Math.atan2(dy, dx)
  return mesh
}

function roomMesh(room: Room, elevation: number): THREE.Mesh {
  // Shape in the XY plane with plan-y negated so rotateX(-PI/2) lands it on
  // (x, elevation, y_plan) facing up.
  const shape = new THREE.Shape()
  room.points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, -y)
    else shape.lineTo(x, -y)
  })
  const geometry = new THREE.ShapeGeometry(shape)
  geometry.rotateX(-Math.PI / 2)
  const material = new THREE.MeshLambertMaterial({
    color: room.floorColor ?? DEFAULT_FLOOR_COLOR,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `room:${room.id}`
  mesh.position.y = elevation
  return mesh
}

function furnitureMesh(item: Furniture, elevation: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(item.width, item.height, item.depth)
  const material = new THREE.MeshLambertMaterial({
    color: item.color ?? DEFAULT_FURNITURE_COLOR,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `furniture:${item.id}`
  mesh.position.set(item.x, elevation + item.elevation + item.height / 2, item.y)
  mesh.rotation.y = THREE.MathUtils.degToRad(item.angleDeg)
  return mesh
}

/** Full scene rebuild from a normalized home snapshot. Deterministic. */
export function buildScene(home: NormalizedHomeState): THREE.Scene {
  const scene = new THREE.Scene()
  if (home.environment.skyColor !== null) {
    scene.background = new THREE.Color(home.environment.skyColor)
  }

  // SH3D lights via Java3D materials/headlight; approximated here with
  // ambient + directional from environment.lightColor (documented deviation;
  // photometric parity is a later integration concern).
  const lightColor = home.environment.lightColor ?? 0xffffff
  scene.add(new THREE.AmbientLight(lightColor, 0.55))
  const directional = new THREE.DirectionalLight(lightColor, 0.9)
  directional.position.set(0.5, 1, 0.35)
  scene.add(directional)

  if (home.environment.groundColor !== null) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_SIZE_CM, GROUND_SIZE_CM),
      new THREE.MeshLambertMaterial({ color: home.environment.groundColor }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.name = 'ground'
    scene.add(ground)
  }

  const elevations = levelElevationMap(home)
  // SH3D HomeEnvironment default wallsAlpha = 0 (walls fully opaque).
  const wallsTransparency = home.environment.wallsAlpha ?? 0

  const root = new THREE.Group()
  root.name = 'home'
  for (const wall of home.walls) {
    root.add(wallMesh(wall, elevationFor(wall.levelRef, elevations), wallsTransparency))
  }
  for (const room of home.rooms) {
    if (room.floorVisible === false || room.points.length < 3) continue
    root.add(roomMesh(room, elevationFor(room.levelRef, elevations)))
  }
  for (const item of home.furniture) {
    if (item.visible === false) continue
    root.add(furnitureMesh(item, elevationFor(item.levelRef, elevations)))
  }
  scene.add(root)
  return scene
}
