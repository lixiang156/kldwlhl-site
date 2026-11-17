import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { EYE_HEIGHT, PLAYER_RADIUS, WALK_SPEED, RUN_SPEED, SPAWN, HALF } from './constants'

/**
 * 第一人称漫游。
 *
 * - PointerLockControls 只负责「鼠标转头」，位移由我们自己算，
 *   这样才能做碰撞检测（直接 moveForward() 会穿墙）。
 * - 碰撞用「分轴移动 + AABB 推出」的土办法：
 *   先试 X 轴，撞了就撤销；再试 Z 轴。稳定、便宜，够一个小屋用。
 *   想升级可以换 three/addons/math/Octree.js。
 */
export class Player {
  constructor(camera, domElement, { bounds, colliders, onLockChange }) {
    this.camera = camera
    this.domElement = domElement
    this.bounds = bounds
    this.colliders = colliders
    this.onLockChange = onLockChange || (() => {})

    this.controls = new PointerLockControls(camera, domElement)
    this.controls.pointerSpeed = 0.9

    this.keys = new Set()
    this.velocity = new THREE.Vector3()
    this.bobTime = 0
    this.enabled = true
    this.position = new THREE.Vector3(SPAWN.x, EYE_HEIGHT, SPAWN.z)

    this._forward = new THREE.Vector3()
    this._right = new THREE.Vector3()
    this._desired = new THREE.Vector3()
    this._up = new THREE.Vector3(0, 1, 0)

    this._onLock = () => this.onLockChange(true)
    this._onUnlock = () => {
      this.keys.clear()
      this.onLockChange(false)
    }
    this.controls.addEventListener('lock', this._onLock)
    this.controls.addEventListener('unlock', this._onUnlock)

    this._onKeyDown = (e) => {
      if (!this.enabled || !this.controls.isLocked) return
      const code = e.code
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'Space'].includes(code)) {
        this.keys.add(code)
        if (code === 'Space') e.preventDefault()
      }
    }
    this._onKeyUp = (e) => this.keys.delete(e.code)
    this._onBlur = () => this.keys.clear()

    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
    window.addEventListener('blur', this._onBlur)

    this.reset()
  }

  get isLocked() {
    return this.controls.isLocked
  }

  lock() {
    this.controls.lock()
  }

  unlock() {
    if (this.controls.isLocked) this.controls.unlock()
  }

  /** 回到出生点，视线朝房间深处 */
  reset() {
    this.position.set(SPAWN.x, EYE_HEIGHT, SPAWN.z)
    this.camera.position.copy(this.position)
    this.camera.rotation.set(0, 0, 0)
    this.velocity.set(0, 0, 0)
    this.bobTime = 0
  }

  /** 巡游结束后，把玩家逻辑位置同步到当前相机位置 */
  syncFromCamera() {
    this.position.set(this.camera.position.x, EYE_HEIGHT, this.camera.position.z)
    this.camera.position.y = EYE_HEIGHT
    this.camera.rotation.z = 0
    this.velocity.set(0, 0, 0)
    this.keys.clear()
  }

  /** 判断某个平面坐标是否被家具/墙挡住 */
  isBlocked(x, z) {
    const r = PLAYER_RADIUS
    if (x < -HALF.x + r || x > HALF.x - r) return true
    if (z < -HALF.z + r || z > HALF.z - r) return true
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i]
      if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return true
    }
    return false
  }

  update(dt) {
    if (!this.enabled) return
    dt = Math.min(dt, 0.05)

    const keys = this.keys
    let inputX = 0
    let inputZ = 0
    if (this.controls.isLocked) {
      if (keys.has('KeyW') || keys.has('ArrowUp')) inputZ += 1
      if (keys.has('KeyS') || keys.has('ArrowDown')) inputZ -= 1
      if (keys.has('KeyD') || keys.has('ArrowRight')) inputX += 1
      if (keys.has('KeyA') || keys.has('ArrowLeft')) inputX -= 1
    }

    const running = keys.has('ShiftLeft') || keys.has('ShiftRight')
    const speed = running ? RUN_SPEED : WALK_SPEED

    this.camera.getWorldDirection(this._forward)
    this._forward.y = 0
    if (this._forward.lengthSq() < 1e-6) this._forward.set(0, 0, -1)
    this._forward.normalize()
    this._right.crossVectors(this._forward, this._up).normalize()

    this._desired
      .copy(this._forward)
      .multiplyScalar(inputZ)
      .addScaledVector(this._right, inputX)
    if (this._desired.lengthSq() > 1) this._desired.normalize()
    this._desired.multiplyScalar(speed)

    // 平滑加速 / 减速
    const smoothing = 1 - Math.pow(0.0001, dt)
    this.velocity.lerp(this._desired, smoothing)

    const dx = this.velocity.x * dt
    const dz = this.velocity.z * dt

    // 分轴移动 + 碰撞
    let nextX = this.position.x + dx
    if (!this.isBlocked(nextX, this.position.z)) {
      this.position.x = nextX
    } else {
      this.velocity.x = 0
    }
    let nextZ = this.position.z + dz
    if (!this.isBlocked(this.position.x, nextZ)) {
      this.position.z = nextZ
    } else {
      this.velocity.z = 0
    }

    // 走路时轻微上下起伏
    const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z)
    if (planarSpeed > 0.15) {
      this.bobTime += dt * (running ? 11 : 8)
    } else {
      this.bobTime += dt * 1.5
    }
    const bob = Math.sin(this.bobTime) * 0.016 * Math.min(planarSpeed / WALK_SPEED, 1)

    this.camera.position.set(this.position.x, EYE_HEIGHT + bob, this.position.z)
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    window.removeEventListener('blur', this._onBlur)
    this.controls.removeEventListener('lock', this._onLock)
    this.controls.removeEventListener('unlock', this._onUnlock)
    this.controls.dispose()
  }
}
