import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import Stats from 'stats.js'
import GUI from 'lil-gui'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'

import { ROOM, TIME_ORDER, TIME_PRESETS, SPAWN, EYE_HEIGHT } from './constants'
import { buildRoom } from './RoomBuilder'
import { Lighting } from './Lighting'
import { Player } from './Player'
import { InteractionSystem } from './interactions'
import { Particles } from './particles'
import { CinematicTour } from './tour'
import { LofiPlayer } from '../audio/LofiPlayer'
import { tweenGroup } from './tweenGroup'

const PICK_TYPES = ['photo', 'pc', 'book', 'radio', 'door', 'lamp', 'info']

/**
 * 把整个 Three.js 世界包成一个类，Vue 只负责 UI。
 * 这样 UI 和 3D 解耦，以后换框架也能复用。
 */
export class BedroomApp {
  constructor(options) {
    this.options = options || {}
    this.canvas = this.options.canvas
    this.statsContainer = this.options.statsContainer
    this.guiContainer = this.options.guiContainer
    const baseUrl = import.meta.env.BASE_URL || '/'
    this.modelUrl = this.options.modelUrl || baseUrl + 'models/bedroom.glb'
    this.baseUrl = baseUrl

    this.scene = null
    this.camera = null
    this.renderer = null
    this.room = null
    this.lighting = null
    this.player = null
    this.interactions = null
    this.particles = null
    this.tour = null
    this.music = null

    this._lastTime = performance.now()
    this.elapsed = 0
    this.disposed = false
    this.usingGLB = false
    this.timeMode = 'day'
    this.colliderHelpers = null

    this._handlers = {}
  }

  emit(name, payload) {
    const fn = this.options[name]
    if (typeof fn === 'function') fn(payload)
  }

  async init() {
    this._initRenderer()
    this._initScene()
    this.emit('onProgress', { progress: 0.12, label: '搭房间…' })

    this.room = await this._loadRoom()
    this.scene.add(this.room.group)
    this.emit('onProgress', { progress: 0.72, label: '点灯…' })

    this.lighting = new Lighting(this.scene, this.room.lights)
    this.particles = new Particles(this.scene)
    this.particles.setNightness(0)

    this._initPlayer()
    this._initInteractions()
    this._initTour()
    this._initMusic()
    this._initDebug()
    this.emit('onProgress', { progress: 0.9, label: '编译着色器…' })

    this._bindResize()
    this._bindShortcuts()

    // 先渲染一帧，提前编译着色器，避免进场卡顿
    this.renderer.compile(this.scene, this.camera)
    this.renderer.render(this.scene, this.camera)
    this.emit('onProgress', { progress: 1, label: '完成' })

    this._lastTime = performance.now()
    this.renderer.setAnimationLoop(() => this._tick())
  }

  /* ================================================================ */
  /* 初始化                                                            */
  /* ================================================================ */
  _initRenderer() {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(window.innerWidth, window.innerHeight, false)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer = renderer
  }

  _initScene() {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b0e18)
    this.scene = scene

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 220)
    camera.rotation.order = 'YXZ'
    camera.position.set(SPAWN.x, EYE_HEIGHT, SPAWN.z)
    this.camera = camera
  }

  async _loadRoom() {
    let gltf = null
    try {
      gltf = await this._tryLoadGLB()
    } catch (err) {
      console.warn('[Bedroom] GLB 加载失败，使用程序化房间：', err)
    }
    if (gltf) {
      this.usingGLB = true
      return this._prepareGLB(gltf)
    }
    if (this.options.forceProcedural !== true) {
      console.info('[Bedroom] 没有找到 public/models/bedroom.glb，使用程序化房间。')
    }
    return buildRoom(this.renderer)
  }

  async _tryLoadGLB() {
    if (this.options.useGLB === false) return null
    const url = this.modelUrl
    let head
    try {
      head = await fetch(url, { method: 'HEAD' })
    } catch {
      return null
    }
    if (!head.ok) return null
    const ct = head.headers.get('content-type') || ''
    // Vite 对不存在的文件会返回 index.html
    if (ct.includes('text/html')) return null

    const loader = new GLTFLoader()
    const draco = new DRACOLoader()
    draco.setDecoderPath((import.meta.env.BASE_URL || '/') + 'draco/')
    loader.setDRACOLoader(draco)

    return new Promise((resolve) => {
      loader.load(
        url,
        (gltf) => {
          draco.dispose()
          resolve(gltf)
        },
        (evt) => {
          if (evt && evt.total) {
            const p = 0.15 + (evt.loaded / evt.total) * 0.5
            this.emit('onProgress', { progress: Math.min(p, 0.68), label: '加载模型…' })
          }
        },
        (err) => {
          console.warn('[Bedroom] GLB 解析失败：', err)
          draco.dispose()
          resolve(null)
        }
      )
    })
  }

  /**
   * 处理 Blender 导出的 GLB。
   *
   * 约定（详见 docs/blender-guide.md）：
   *   PICK_xxx   → 可点击物体，名字里的类型会映射成交互行为
   *   COL_xxx    → 碰撞盒（一个立方体），运行时会被隐藏
   */
  _prepareGLB(gltf) {
    const root = gltf.scene
    root.updateMatrixWorld(true)

    const colliders = []
    const picks = []
    const box = new THREE.Box3()
    const size = new THREE.Vector3()

    const toRemove = []

    root.traverse((obj) => {
      if (!obj.isMesh) return
      obj.castShadow = true
      obj.receiveShadow = true
      // 材质兜底：Blender 里忘了设置会导致全黑
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((m) => {
        if (!m) return
        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace
        if (m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace
        m.side = THREE.FrontSide
      })

      // 小物体不投阴影，省性能
      box.setFromObject(obj)
      box.getSize(size)
      const volume = Math.max(size.x, 0.001) * Math.max(size.y, 0.001) * Math.max(size.z, 0.001)
      if (volume < 0.004) obj.castShadow = false
    })

    // 收集 COL_ 碰撞盒
    root.traverse((obj) => {
      if (obj.name && obj.name.startsWith('COL_')) {
        const b = new THREE.Box3().setFromObject(obj)
        colliders.push({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z })
        toRemove.push(obj)
      }
    })
    toRemove.forEach((o) => o.parent && o.parent.remove(o))

    // 收集 PICK_ 交互物体
    root.traverse((obj) => {
      if (!obj.name || !obj.name.startsWith('PICK_')) return
      const data = this._resolvePickData(obj)
      obj.userData.pick = data
      picks.push({ root: obj, data })
    })

    const lights = {}
    // GLB 里通常没有灯（按规范应该删掉），给个兜底吊灯
    const ceiling = new THREE.PointLight(0xffd9a8, 0.6, 8, 1.8)
    ceiling.position.set(0, ROOM.height - 0.6, 0)
    root.add(ceiling)
    lights.ceiling = ceiling

    return { group: root, colliders, picks, lights, bounds: null }
  }

  _resolvePickData(obj) {
    const name = obj.name.replace(/^PICK_/, '')
    const type = PICK_TYPES.find((t) => name.toLowerCase().startsWith(t)) || 'info'
    const ud = obj.userData || {}
    const label = ud.label || name
    const base = { id: name, type, label, hint: ud.hint || '点击 · 查看' }

    if (type === 'photo') {
      return {
        ...base,
        hint: '点击 · 放大查看',
        title: ud.title || label,
        caption: ud.caption || '',
        image: ud.image || null,
      }
    }
    if (type === 'pc') {
      return { ...base, type: 'link', hint: '点击 · 打开链接', title: label, url: ud.url || 'https://github.com/' }
    }
    if (type === 'door') {
      return { ...base, title: '门后的世界', text: ud.text || '这里以后可以接第二个房间（Portal）。' }
    }
    return { ...base, title: label, text: ud.text || '' }
  }

  _initPlayer() {
    const bounds = { minX: -ROOM.width / 2, maxX: ROOM.width / 2, minZ: -ROOM.depth / 2, maxZ: ROOM.depth / 2 }
    this.player = new Player(this.camera, this.canvas, {
      bounds,
      colliders: this.room.colliders,
      onLockChange: (locked) => {
        if (this.interactions) this.interactions.setLocked(locked)
        if (!locked && this.interactions) this.interactions.onHover(null)
        this.emit('onLockChange', locked)
      },
    })
  }

  _initInteractions() {
    this.interactions = new InteractionSystem({
      camera: this.camera,
      domElement: this.canvas,
      sceneRoot: this.room.group,
      onHover: (data) => this.emit('onHover', data),
      onPick: (hit) => this._handlePick(hit),
    })
  }

  _handlePick(hit) {
    const data = hit.data
    if (!data) return
    if (data.type === 'link') {
      const url = data.url
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
        this.emit('onToast', { text: '新标签打开了 ' + url, icon: '🔗' })
      }
      return
    }
    if (data.type === 'radio') {
      this.toggleMusic()
      return
    }
    if (data.type === 'lamp') {
      const on = this.lighting.toggleDeskLamp()
      this.emit('onToast', { text: on ? '台灯打开了' : '台灯关上了', icon: on ? '💡' : '🌙' })
      return
    }
    this.emit('onPick', data)
  }

  _initTour() {
    this.tour = new CinematicTour(this.camera, {
      onStateChange: (active) => this.emit('onTourChange', active),
    })
  }

  _initMusic() {
    this.music = new LofiPlayer({ src: (import.meta.env.BASE_URL || '/') + 'audio/bgm.mp3' })
  }

  _initDebug() {
    if (this.statsContainer) {
      this.stats = new Stats()
      this.stats.dom.style.position = 'absolute'
      this.stats.dom.style.top = '0px'
      this.stats.dom.style.left = '0px'
      this.stats.dom.style.zIndex = '2'
      this.statsContainer.appendChild(this.stats.dom)
    }

    if (this.guiContainer) {
      const gui = new GUI({ container: this.guiContainer, title: '⚙ 参数面板', width: 248 })
      gui.close()

      const lightFolder = gui.addFolder('灯光')
      lightFolder.add(this.lighting.ambient, 'intensity', 0, 4, 0.01).name('环境光强度')
      lightFolder.add(this.lighting.hemi, 'intensity', 0, 3, 0.01).name('半球光强度')
      lightFolder.add(this.lighting.sun, 'intensity', 0, 8, 0.05).name('太阳强度')
      lightFolder.add(this.lighting.sun.position, 'x', -20, 20, 0.1).name('太阳 X')
      lightFolder.add(this.lighting.sun.position, 'y', 0, 20, 0.1).name('太阳 Y')
      lightFolder.add(this.lighting.sun.position, 'z', -20, 20, 0.1).name('太阳 Z')
      if (this.room.lights.ceiling) lightFolder.add(this.room.lights.ceiling, 'intensity', 0, 3, 0.01).name('吊灯')
      if (this.room.lights.deskLamp) lightFolder.add(this.room.lights.deskLamp, 'intensity', 0, 4, 0.01).name('台灯')

      const sceneFolder = gui.addFolder('场景')
      sceneFolder.add(this, 'timeMode', TIME_ORDER).name('时段').onChange((v) => this.setTimeOfDay(v))
      sceneFolder.add(this.lighting.state, 'exposure', 0.4, 2, 0.01).name('曝光')
      sceneFolder.add(this.particles.dustMat, 'opacity', 0, 1, 0.01).name('尘埃')
      sceneFolder.add(this.particles.fireflyMat, 'opacity', 0, 1, 0.01).name('萤火虫')

      const camFolder = gui.addFolder('相机 / 位置')
      camFolder.add(this.camera, 'fov', 30, 100, 1).name('FOV').onChange(() => {
        this.camera.updateProjectionMatrix()
      })
      camFolder
        .add(this.player.position, 'x', -3.2, 3.2, 0.01)
        .name('玩家 X')
        .onChange((v) => {
          if (!this.player.isBlocked(v, this.player.position.z)) this.player.position.x = v
          else this.player.position.x = v
        })
      camFolder.add(this.player.position, 'z', -2.7, 2.7, 0.01).name('玩家 Z')
      camFolder.add(this, 'showColliders').name('显示碰撞盒')

      this.gui = gui
    }
  }

  get showColliders() {
    return !!this.colliderHelpers
  }

  set showColliders(v) {
    if (v) {
      const group = new THREE.Group()
      this.room.colliders.forEach((c) => {
        const geo = new THREE.BoxGeometry(c.maxX - c.minX, 1.8, c.maxZ - c.minZ)
        const helper = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: 0x62e0ff })
        )
        helper.position.set((c.minX + c.maxX) / 2, 0.9, (c.minZ + c.maxZ) / 2)
        group.add(helper)
        geo.dispose()
      })
      this.scene.add(group)
      this.colliderHelpers = group
    } else if (this.colliderHelpers) {
      this.scene.remove(this.colliderHelpers)
      this.colliderHelpers.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) o.material.dispose()
      })
      this.colliderHelpers = null
    }
  }

  /* ================================================================ */
  /* 对外方法                                                          */
  /* ================================================================ */
  start() {
    if (!this.player) return
    if (this.tour && this.tour.isActive) this.tour.stop()
    this.player.lock()
  }

  setTimeOfDay(mode) {
    if (!TIME_PRESETS[mode]) return
    this.timeMode = mode
    this.lighting.setPreset(mode)
    this.particles.setNightness(TIME_PRESETS[mode].stars)
    this.emit('onTimeChange', mode)
  }

  cycleTimeOfDay() {
    const idx = TIME_ORDER.indexOf(this.timeMode)
    const next = TIME_ORDER[(idx + 1) % TIME_ORDER.length]
    this.setTimeOfDay(next)
    return next
  }

  returnToStart() {
    if (this.tour && this.tour.isActive) this.tour.stop()
    const from = { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z }
    const fromRot = { y: this.camera.rotation.y, x: this.camera.rotation.x }
    if (this._returnTween) this._returnTween.stop()
    const progress = { k: 0 }
    this._returnTween = new TWEEN.Tween(progress, tweenGroup)
      .to({ k: 1 }, 900)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        const k = progress.k
        this.camera.position.set(
          THREE.MathUtils.lerp(from.x, SPAWN.x, k),
          THREE.MathUtils.lerp(from.y, EYE_HEIGHT, k),
          THREE.MathUtils.lerp(from.z, SPAWN.z, k)
        )
        this.camera.rotation.set(THREE.MathUtils.lerp(fromRot.x, 0, k), THREE.MathUtils.lerp(fromRot.y, 0, k), 0)
      })
      .onComplete(() => {
        this.player.reset()
      })
      .start()
    this.emit('onToast', { text: '回到起点', icon: '🏠' })
  }

  async toggleTour() {
    if (!this.tour) return
    if (this.tour.isActive) {
      this.tour.stop()
      this.player.enabled = true
      this.player.syncFromCamera()
      return
    }
    this.player.unlock()
    this.player.enabled = false
    await this.tour.start()
    this.player.enabled = true
    this.player.syncFromCamera()
    this.emit('onToast', { text: '自动巡游结束，点击画面继续漫游', icon: '🎬' })
  }

  async toggleMusic() {
    const playing = await this.music.toggle()
    this.emit('onMusicChange', playing)
    this.emit('onToast', { text: playing ? '背景音乐播放中' : '背景音乐已暂停', icon: playing ? '🎵' : '🔇' })
    return playing
  }

  /* ================================================================ */
  /* 循环                                                              */
  /* ================================================================ */
  _tick() {
    if (this.disposed) return
    const now = performance.now()
    const dt = Math.min((now - this._lastTime) / 1000, 0.1)
    this._lastTime = now
    this.elapsed += dt

    tweenGroup.update(now)
    if (this.player) this.player.update(dt)
    if (this.particles) this.particles.update(dt)
    if (this.interactions) this.interactions.update(this.elapsed)

    if (this.lighting) {
      this.lighting.applyToScene()
      this.renderer.toneMappingExposure = this.lighting.state.exposure
    }

    this.renderer.render(this.scene, this.camera)
    if (this.stats) this.stats.update()
  }

  _bindResize() {
    this._onResize = () => {
      if (!this.renderer) return
      const w = window.innerWidth
      const h = window.innerHeight
      this.renderer.setSize(w, h, false)
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', this._onResize)
  }

  _bindShortcuts() {
    this._onKeyDown = (e) => {
      if (e.repeat) return
      const tag = document.activeElement && document.activeElement.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      switch (e.code) {
        case 'KeyT':
          this.toggleTour()
          break
        case 'KeyM':
          this.toggleMusic()
          break
        case 'Digit1':
          this.setTimeOfDay('day')
          break
        case 'Digit2':
          this.setTimeOfDay('dusk')
          break
        case 'Digit3':
          this.setTimeOfDay('night')
          break
        case 'KeyL':
          this.lighting.toggleDeskLamp()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', this._onKeyDown)
  }

  dispose() {
    this.disposed = true
    window.removeEventListener('resize', this._onResize)
    window.removeEventListener('keydown', this._onKeyDown)
    if (this.renderer) this.renderer.setAnimationLoop(null)
    if (this.player) this.player.dispose()
    if (this.interactions) this.interactions.dispose()
    if (this.particles) this.particles.dispose()
    if (this.lighting) this.lighting.dispose()
    if (this.music) this.music.dispose()
    if (this.stats) this.stats.dom.remove()
    if (this.gui) this.gui.destroy()
    if (this.colliderHelpers) this.colliderHelpers.clear()
    if (this.renderer) this.renderer.dispose()
  }
}
