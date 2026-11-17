import * as THREE from 'three'
import { HALF, ROOM } from './constants'
import { makeGlowTexture } from './textures'

/**
 * 两套粒子：
 *  - 萤火虫（夜晚，房间里慢悠悠地飘）
 *  - 空气尘埃（白天，窗边光柱里的浮尘）
 * 两边用 opacity 跟随昼夜切换。
 */
export class Particles {
  constructor(scene) {
    const glow = makeGlowTexture()
    this.elapsed = 0

    /* ---------- 萤火虫 ---------- */
    const count = 46
    this.fireflyCount = count
    const positions = new Float32Array(count * 3)
    this.fireflyBase = []
    this.fireflyPhase = []
    for (let i = 0; i < count; i++) {
      const base = new THREE.Vector3(
        (Math.random() - 0.5) * ROOM.width * 0.82,
        0.35 + Math.random() * 1.7,
        (Math.random() - 0.5) * ROOM.depth * 0.82
      )
      this.fireflyBase.push(base)
      this.fireflyPhase.push({ r: 0.3 + Math.random() * 0.9, s: 0.3 + Math.random() * 0.8, p: Math.random() * Math.PI * 2 })
      positions[i * 3] = base.x
      positions[i * 3 + 1] = base.y
      positions[i * 3 + 2] = base.z
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.fireflyMat = new THREE.PointsMaterial({
      color: 0xc4ff9e,
      size: 0.055,
      map: glow,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    this.fireflies = new THREE.Points(geo, this.fireflyMat)
    this.fireflies.frustumCulled = false
    scene.add(this.fireflies)

    /* ---------- 尘埃 ---------- */
    const dustCount = 160
    const dpos = new Float32Array(dustCount * 3)
    this.dustSpeed = new Float32Array(dustCount)
    for (let i = 0; i < dustCount; i++) {
      dpos[i * 3] = (Math.random() - 0.5) * ROOM.width * 0.9
      dpos[i * 3 + 1] = Math.random() * ROOM.height
      dpos[i * 3 + 2] = (Math.random() - 0.5) * ROOM.depth * 0.9
      this.dustSpeed[i] = 0.02 + Math.random() * 0.06
    }
    const dgeo = new THREE.BufferGeometry()
    dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3))
    this.dustMat = new THREE.PointsMaterial({
      color: 0xfff3d8,
      size: 0.022,
      map: glow,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    this.dust = new THREE.Points(dgeo, this.dustMat)
    this.dust.frustumCulled = false
    scene.add(this.dust)
  }

  /** nightness: 0 (白天) ~ 1 (夜晚) */
  setNightness(k) {
    this.fireflyMat.opacity = Math.max(0, k - 0.35) * 0.95
    this.dustMat.opacity = 0.08 + (1 - k) * 0.35
  }

  update(dt) {
    this.elapsed += dt
    const t = this.elapsed

    // 萤火虫绕原点缓慢环绕
    const pos = this.fireflies.geometry.attributes.position
    for (let i = 0; i < this.fireflyCount; i++) {
      const base = this.fireflyBase[i]
      const ph = this.fireflyPhase[i]
      const a = t * ph.s + ph.p
      pos.array[i * 3] = base.x + Math.cos(a) * ph.r
      pos.array[i * 3 + 1] = base.y + Math.sin(a * 1.7 + ph.p) * 0.22
      pos.array[i * 3 + 2] = base.z + Math.sin(a * 0.8) * ph.r
    }
    pos.needsUpdate = true

    // 尘埃缓慢上升，飘出顶部后回到地面
    const dpos = this.dust.geometry.attributes.position
    for (let i = 0; i < this.dustSpeed.length; i++) {
      let y = dpos.array[i * 3 + 1] + this.dustSpeed[i] * dt
      if (y > ROOM.height) {
        y = 0.05
        dpos.array[i * 3] = (Math.random() - 0.5) * HALF.x * 1.8
        dpos.array[i * 3 + 2] = (Math.random() - 0.5) * HALF.z * 1.8
      }
      dpos.array[i * 3 + 1] = y
      dpos.array[i * 3] += Math.sin(t * 0.5 + i) * 0.0004
    }
    dpos.needsUpdate = true
  }

  dispose() {
    this.fireflies.geometry.dispose()
    this.fireflyMat.dispose()
    this.dust.geometry.dispose()
    this.dustMat.dispose()
  }
}
