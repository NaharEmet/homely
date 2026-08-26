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
  const material = new THREE.MeshStandardMaterial({
    color: wall.leftSideColor ?? DEFAULT_WALL_COLOR,
    roughness: 0.7,
    metalness: 0.0,
  })
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
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function wallEdges(wall: Wall, elevation: number): THREE.LineSegments {
  const dx = wall.xEnd - wall.xStart
  const dy = wall.yEnd - wall.yStart
  const length = Math.hypot(dx, dy)
  const height = wall.height ?? DEFAULT_WALL_HEIGHT_CM
  const geometry = new THREE.BoxGeometry(length, height, wall.thickness)
  const edges = new THREE.EdgesGeometry(geometry)
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.3 }),
  )
  line.position.set(
    (wall.xStart + wall.xEnd) / 2,
    elevation + height / 2,
    (wall.yStart + wall.yEnd) / 2,
  )
  line.rotation.y = Math.atan2(dy, dx)
  return line
}

function roomMesh(room: Room, elevation: number): THREE.Mesh {
  const shape = new THREE.Shape()
  room.points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, -y)
    else shape.lineTo(x, -y)
  })
  const geometry = new THREE.ShapeGeometry(shape)
  geometry.rotateX(-Math.PI / 2)
  const material = new THREE.MeshStandardMaterial({
    color: room.floorColor ?? DEFAULT_FLOOR_COLOR,
    side: THREE.DoubleSide,
    roughness: 0.7,
    metalness: 0.0,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `room:${room.id}`
  mesh.position.y = elevation
  mesh.receiveShadow = true
  return mesh
}

function furnitureMesh(item: Furniture, elevation: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(item.width, item.height, item.depth)
  const material = new THREE.MeshStandardMaterial({
    color: item.color ?? DEFAULT_FURNITURE_COLOR,
    roughness: 0.7,
    metalness: 0.0,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `furniture:${item.id}`
  mesh.position.set(item.x, elevation + item.elevation + item.height / 2, item.y)
  mesh.rotation.y = THREE.MathUtils.degToRad(item.angleDeg)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function applySelectionHighlight(scene: THREE.Scene, selectionSet: Set<string>): void {
  for (const name of selectionSet) {
    scene.traverse((object) => {
      if (object.name === name && 'material' in object) {
        const mesh = object as THREE.Mesh
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          if ('emissive' in m) {
            ;(m as THREE.MeshStandardMaterial).emissive.set(0x1a66d6)
            ;(m as THREE.MeshStandardMaterial).emissiveIntensity = 0.3
          }
        }
      }
    })
  }
}

/** Full scene rebuild from a normalized home snapshot. Deterministic. */
export function buildScene(home: NormalizedHomeState): THREE.Scene {
  const scene = new THREE.Scene()
  if (home.environment.skyColor !== null) {
    scene.background = new THREE.Color(home.environment.skyColor)
  }

  // HemisphereLight (natural ambient) + AmbientLight (fill) + DirectionalLight (shadows)
  const skyColor = new THREE.Color(home.environment.skyColor ?? 0xcce4fc)
  const groundColor = new THREE.Color(home.environment.groundColor ?? 0x808080)
  scene.add(new THREE.HemisphereLight(skyColor, groundColor, 0.6))
  scene.add(new THREE.AmbientLight(home.environment.lightColor ?? 0xffffff, 0.3))

  const dirLightColor = new THREE.Color(home.environment.lightColor ?? 0xffffff)
  const directional = new THREE.DirectionalLight(dirLightColor, 0.8)
  directional.position.set(200, 400, 300)
  directional.castShadow = true
  directional.shadow.mapSize.set(2048, 2048)
  directional.shadow.camera.near = 1
  directional.shadow.camera.far = 2000
  directional.shadow.camera.left = -5000
  directional.shadow.camera.right = 5000
  directional.shadow.camera.top = 5000
  directional.shadow.camera.bottom = -5000
  scene.add(directional)

  if (home.environment.groundColor !== null) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_SIZE_CM, GROUND_SIZE_CM),
      new THREE.MeshStandardMaterial({ color: home.environment.groundColor }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.name = 'ground'
    ground.receiveShadow = true
    scene.add(ground)
  }

  const elevations = levelElevationMap(home)
  const wallsTransparency = home.environment.wallsAlpha ?? 0

  const root = new THREE.Group()
  root.name = 'home'
  for (const wall of home.walls) {
    const mesh = wallMesh(wall, elevationFor(wall.levelRef, elevations), wallsTransparency)
    root.add(mesh)
    root.add(wallEdges(wall, elevationFor(wall.levelRef, elevations)))
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

  // Selection highlight
  if (home.selection.length > 0) {
    applySelectionHighlight(scene, new Set(home.selection))
  }

  scene.fog = new THREE.FogExp2(home.environment.skyColor ?? 0xcce4fc, 0.00005)
  return scene
}
