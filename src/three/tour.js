import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { tweenGroup } from './tweenGroup'

/**
 * 自动巡游：镜头按预设路线慢慢逛一圈。
 * 每个 shot = 相机终点 + 视线终点 + 时长（毫秒）。
 */
export const TOUR_SHOTS = [
  { pos: [0.0, 1.62, 2.25], look: [0.0, 1.35, 0.0], duration: 1 },
  { pos: [0.85, 1.55, 1.15], look: [3.35, 1.15, -0.1], duration: 5200 },
  { pos: [1.35, 1.6, -1.15], look: [2.05, 1.3, -2.9], duration: 5200 },
  { pos: [-0.85, 1.58, -1.55], look: [-3.25, 1.25, 0.1], duration: 5200 },
  { pos: [-0.9, 1.62, 1.05], look: [-0.1, 1.55, -3.0], duration: 4600 },
  { pos: [0.0, 1.62, 2.25], look: [0.0, 1.4, -1.0], duration: 4200 },
]

export class CinematicTour {
  constructor(camera, { onStateChange } = {}) {
    this.camera = camera
    this.active = false
    this._tween = null
    this._stopFlag = false
    this.onStateChange = onStateChange || (() => {})
    this._lookTarget = new THREE.Vector3(0, 1.4, -1)
  }

  get isActive() {
    return this.active
  }

  async start() {
    if (this.active) return
    this.active = true
    this._stopFlag = false
    this.onStateChange(true)

    // 从当前位置开始
    const state = {
      px: this.camera.position.x,
      py: this.camera.position.y,
      pz: this.camera.position.z,
      lx: this.camera.position.x,
      ly: this.camera.position.y,
      lz: this.camera.position.z - 3,
    }
    // 让第一段从当前位置平滑过渡
    const first = TOUR_SHOTS[0]
    await this._tweenTo(state, first, 900)
    if (this._stopFlag) return this._finish()

    for (let i = 1; i < TOUR_SHOTS.length; i++) {
      if (this._stopFlag) break
      const shot = TOUR_SHOTS[i]
      await this._tweenTo(state, shot, shot.duration)
    }
    this._finish()
  }

  _tweenTo(state, shot, duration) {
    return new Promise((resolve) => {
      if (this._tween) this._tween.stop()
      const tween = new TWEEN.Tween(state, tweenGroup)
        .to(
          {
            px: shot.pos[0],
            py: shot.pos[1],
            pz: shot.pos[2],
            lx: shot.look[0],
            ly: shot.look[1],
            lz: shot.look[2],
          },
          duration
        )
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          this.camera.position.set(state.px, state.py, state.pz)
          this._lookTarget.set(state.lx, state.ly, state.lz)
          this.camera.lookAt(this._lookTarget)
        })
        .onComplete(() => {
          this._tween = null
          resolve()
        })
        .start()
      this._tween = tween
    })
  }

  stop() {
    this._stopFlag = true
    if (this._tween) {
      this._tween.stop()
      this._tween = null
    }
    this._finish()
  }

  _finish() {
    if (!this.active) return
    this.active = false
    this.onStateChange(false)
  }
}
