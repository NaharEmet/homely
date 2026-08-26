import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
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
  private controls: OrbitControls | undefined
  private readonly unobserve: () => void
  private _isFirstBuild = true
  private _animationFrame: number | undefined
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
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      container.appendChild(renderer.domElement)
      this.renderer = renderer

      this.controls = new OrbitControls(this.perspectiveCamera, renderer.domElement)
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.1
      this.controls.target.set(0, 0, 0)
      this.controls.minDistance = 50
      this.controls.maxDistance = 50_000
      this.controls.update()

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
    const cam = this.director.usePreset(name)

    if (this.controls) {
      this.cancelAnimation()
      const targetPos = new THREE.Vector3(cam.x, cam.z, cam.y)
      const targetLook = new THREE.Vector3(0, 0, 0)

      this.controls.enableDamping = false
      this.perspectiveCamera.position.copy(targetPos)
      this.controls.target.copy(targetLook)
      this.controls.update()
      this.controls.enableDamping = true
    } else {
      this.applyCameraState(cam)
    }
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
    let savedTarget: THREE.Vector3 | undefined
    let savedPosition: THREE.Vector3 | undefined

    if (this.controls && !this._isFirstBuild) {
      savedTarget = this.controls.target.clone()
      savedPosition = this.perspectiveCamera.position.clone()
    }

    this.disposeSceneObjects(this._scene)
    this._scene = buildScene(this.store.getHome())

    if (this.controls && savedTarget && savedPosition) {
      this.perspectiveCamera.position.copy(savedPosition)
      this.controls.target.copy(savedTarget)
      this.controls.update()
    }

    this._isFirstBuild = false
    this.render()
  }

  render(): void {
    this.controls?.update()
    this.renderer?.render(this._scene, this.perspectiveCamera)
  }

  dispose(): void {
    this.cancelAnimation()
    this.unobserve()
    this.controls?.dispose()
    if (this.renderer) window.removeEventListener('resize', this.handleResize)
    this.disposeSceneObjects(this._scene)
    this.renderer?.dispose()
  }

  private cancelAnimation(): void {
    if (this._animationFrame !== undefined) {
      cancelAnimationFrame(this._animationFrame)
      this._animationFrame = undefined
    }
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
