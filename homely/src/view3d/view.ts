import * as THREE from 'three'
import { HomeModel } from '../core/model'
import { HomeStore } from '../core/store'
import { CameraDirector, type CameraPatch, type CameraPresetName } from './cameras'
import { buildScene } from './scene'
import { observeStore } from './watch'

export interface View3DOptions {
  /** DOM container; when absent the view stays a headless scene graph. */
  container?: HTMLElement
  width?: number
  height?: number
}

/**
 * Deterministic 3D view over one HomeStore: full-scene rebuild on every
 * store change, render strictly on demand (store change, camera command,
 * resize) — never on a timer (ws-protocol determinism rules).
 */
export class View3D {
  readonly director: CameraDirector
  readonly domElement: HTMLCanvasElement | undefined

  private _scene: THREE.Scene
  private readonly perspectiveCamera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer | undefined
  private readonly unobserve: () => void
  private readonly handleResize = (): void => {
    const container = this.domElement?.parentElement
    if (!container) return
    this.resizeTo(container.clientWidth || 800, container.clientHeight || 600)
  }

  constructor(
    private readonly store: HomeStore,
    options: View3DOptions = {},
  ) {
    this.director = new CameraDirector(store, new HomeModel(store))
    this._scene = buildScene(store.getHome())
    this.perspectiveCamera = new THREE.PerspectiveCamera(63, 4 / 3, 1, 500_000)
    this.perspectiveCamera.rotation.order = 'YXZ'
    this.unobserve = observeStore(store, () => this.rebuild())
    this.syncCamera()

    const container = options.container
    if (container) {
      const width = options.width ?? (container.clientWidth || 800)
      const height = options.height ?? (container.clientHeight || 600)
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setPixelRatio(1)
      renderer.setSize(width, height)
      container.appendChild(renderer.domElement)
      this.renderer = renderer
      window.addEventListener('resize', this.handleResize)
    }
  }

  get scene(): THREE.Scene {
    return this._scene
  }

  get camera(): THREE.PerspectiveCamera {
    return this.perspectiveCamera
  }

  /** Switch which preset the viewport shows ("top" | "observer"). */
  setActivePreset(name: CameraPresetName): void {
    this.applyCameraState(this.director.usePreset(name))
    this.render()
  }

  setCamera(patch: CameraPatch): void {
    this.director.setCamera(patch)
    this.syncCamera()
    this.render()
  }

  resizeTo(width: number, height: number): void {
    if (!this.renderer) return
    this.renderer.setSize(width, height)
    this.perspectiveCamera.aspect = width / height
    this.perspectiveCamera.updateProjectionMatrix()
    this.render()
  }

  /** Rebuild the whole scene graph from current store state. */
  rebuild(): void {
    this.disposeSceneObjects(this._scene)
    this._scene = buildScene(this.store.getHome())
    this.render()
  }

  render(): void {
    this.renderer?.render(this._scene, this.perspectiveCamera)
  }

  dispose(): void {
    this.unobserve()
    if (this.renderer) window.removeEventListener('resize', this.handleResize)
    this.disposeSceneObjects(this._scene)
    this.renderer?.dispose()
  }

  private syncCamera(): void {
    this.applyCameraState(this.director.getCamera())
  }

  private applyCameraState(cam: {
    x: number
    y: number
    z: number
    yawDeg: number
    pitchDeg: number
    fovDeg: number
  }): void {
    // SH3D HomeComponent3D: world position (planX, heightZ, planY);
    // orientation Ry(PI - yaw) * Rx(-pitch), pitch positive looks down.
    this.perspectiveCamera.position.set(cam.x, cam.z, cam.y)
    this.perspectiveCamera.rotation.y = Math.PI - THREE.MathUtils.degToRad(cam.yawDeg)
    this.perspectiveCamera.rotation.x = -THREE.MathUtils.degToRad(cam.pitchDeg)
    this.perspectiveCamera.fov = cam.fovDeg
    this.perspectiveCamera.updateProjectionMatrix()
  }

  private disposeSceneObjects(scene: THREE.Scene): void {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) material.dispose()
    })
  }
}
