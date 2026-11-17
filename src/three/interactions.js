import * as THREE from 'three'

/**
 * 射线拾取：鼠标在屏幕中心（或鼠标位置）打一条射线，命中可交互物体。
 *
 * 关键点：
 * 1. 对「整个房间」做 raycast，而不是只对 pick 物体 ——
 *    这样墙、桌子会自然遮挡，不会隔着墙点到画框。
 * 2. 命中后沿父级向上找 userData.pick。
 * 3. 判定 click 时比较 pointerdown / pointerup 的位移，
 *    避免拖动视角时误触。
 */
export class InteractionSystem {
  constructor({ camera, domElement, sceneRoot, onHover, onPick }) {
    this.camera = camera
    this.domElement = domElement
    this.sceneRoot = sceneRoot
    this.onHover = onHover || (() => {})
    this.onPick = onPick || (() => {})

    this.raycaster = new THREE.Raycaster()
    this.raycaster.far = 6.5
    this.pointer = new THREE.Vector2(0, 0)
    this.hovered = null
    this.enabled = true
    this.locked = false

    this._downAt = null
    this._lastHoverCheck = 0

    this._onPointerMove = (e) => {
      const rect = this.domElement.getBoundingClientRect()
      this.pointer.x = (e.clientX - rect.left) / rect.width
      this.pointer.y = (e.clientY - rect.top) / rect.height
    }

    this._onPointerDown = (e) => {
      this._downAt = { x: e.clientX, y: e.clientY, t: performance.now() }
    }

    this._onPointerUp = (e) => {
      const down = this._downAt
      this._downAt = null
      if (!down || !this.enabled) return
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
      const elapsed = performance.now() - down.t
      if (moved > 8 || elapsed > 700) return
      const hit = this.cast()
      if (hit) this.onPick(hit)
    }

    window.addEventListener('pointermove', this._onPointerMove, { passive: true })
    domElement.addEventListener('pointerdown', this._onPointerDown)
    domElement.addEventListener('pointerup', this._onPointerUp)
  }

  setLocked(locked) {
    this.locked = locked
  }

  /** 返回命中的 pick 数据（含 object / data） */
  cast() {
    if (!this.sceneRoot) return null
    const ndc = new THREE.Vector2()
    if (this.locked) {
      ndc.set(0, 0)
    } else {
      // 未锁定时用鼠标位置
      ndc.set(this.pointer.x * 2 - 1, -(this.pointer.y * 2 - 1))
    }
    this.raycaster.setFromCamera(ndc, this.camera)
    const hits = this.raycaster.intersectObject(this.sceneRoot, true)
    if (!hits.length) return null
    const first = hits[0]
    let node = first.object
    while (node) {
      if (node.userData && node.userData.pick) {
        return { object: node, data: node.userData.pick, point: first.point, distance: first.distance }
      }
      node = node.parent
    }
    return null
  }

  update(time) {
    if (!this.enabled) return
    if (this.locked && time - this._lastHoverCheck < 0.08) return
    this._lastHoverCheck = time
    const hit = this.cast()
    const id = hit ? hit.data.id : null
    if (id !== this._hoveredId) {
      this._hoveredId = id
      this.hovered = hit ? hit.data : null
      this.onHover(hit ? hit.data : null)
    }
  }

  dispose() {
    window.removeEventListener('pointermove', this._onPointerMove)
    this.domElement.removeEventListener('pointerdown', this._onPointerDown)
    this.domElement.removeEventListener('pointerup', this._onPointerUp)
  }
}
