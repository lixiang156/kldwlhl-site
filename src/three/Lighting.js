import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { TIME_PRESETS } from './constants'
import { tweenGroup } from './tweenGroup'
import { makeGlowTexture, makeSkylineTexture } from './textures'

/**
 * 灯光 + 天空。
 *
 * 模型「发黑」十有八九是光的问题，所以这里把三层光都显式写出来：
 *   1. AmbientLight / HemisphereLight —— 打底，保证暗部不死黑
 *   2. DirectionalLight —— 太阳主光，负责明暗关系和影子
 *   3. PointLight —— 吊灯 / 台灯 / 床头灯，负责暖色氛围
 *
 * 昼夜切换 = 对这三层的颜色、强度、位置做 Tween 插值。
 */

const SKY_VERT = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SKY_FRAG = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform vec3 bottomColor;
  varying vec3 vWorldPosition;

  void main() {
    vec3 dir = normalize(vWorldPosition);
    float h = dir.y;
    vec3 col;
    if (h > 0.0) {
      col = mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.62));
    } else {
      col = mix(horizonColor, bottomColor, pow(clamp(-h, 0.0, 1.0), 0.75));
    }
    // ShaderMaterial 不会自动做色彩空间转换，这里手动近似 sRGB
    gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
  }
`

export class Lighting {
  constructor(scene, roomLights) {
    this.scene = scene
    this.presetName = 'day'
    this.deskLampOn = true
    this.bedLampOn = true
    this.tween = null
    this.currentExposure = 1

    /* ---------------- 天空 ---------------- */
    const skyGeo = new THREE.SphereGeometry(70, 32, 20)
    this.skyUniforms = {
      topColor: { value: new THREE.Color(TIME_PRESETS.day.skyTop) },
      horizonColor: { value: new THREE.Color(TIME_PRESETS.day.skyHorizon) },
      bottomColor: { value: new THREE.Color(TIME_PRESETS.day.skyBottom) },
    }
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
    this.sky = new THREE.Mesh(skyGeo, skyMat)
    this.sky.name = 'sky'
    this.sky.renderOrder = -10
    this.sky.frustumCulled = false
    scene.add(this.sky)

    /* ---------------- 星星 ---------------- */
    const starCount = 900
    const positions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = 62
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 0.95)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.9 + 4
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.55,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: makeGlowTexture(),
    })
    this.stars = new THREE.Points(starGeo, this.starMat)
    this.stars.frustumCulled = false
    this.stars.renderOrder = -9
    scene.add(this.stars)

    /* ---------------- 太阳 / 月亮 ---------------- */
    this.sunSprite = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff2d2, transparent: true, opacity: 0.95, fog: false })
    )
    this.sunSprite.name = 'sunDisk'
    scene.add(this.sunSprite)

    this.sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        color: 0xffe9b0,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    )
    this.sunGlow.scale.set(26, 26, 1)
    scene.add(this.sunGlow)

    /* ---------------- 窗外的城市剪影 ---------------- */
    this.skylineMat = new THREE.MeshBasicMaterial({
      map: makeSkylineTexture(),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      fog: false,
    })
    this.skyline = new THREE.Mesh(new THREE.PlaneGeometry(30, 7.5), this.skylineMat)
    this.skyline.position.set(0, -0.35, -22)
    this.skyline.renderOrder = -8
    scene.add(this.skyline)

    /* ---------------- 基础光照 ---------------- */
    this.ambient = new THREE.AmbientLight(0xdfeaff, 1.0)
    this.ambient.name = 'ambient'
    scene.add(this.ambient)

    this.hemi = new THREE.HemisphereLight(0xcfe6ff, 0xc8a985, 0.55)
    this.hemi.name = 'hemisphere'
    scene.add(this.hemi)

    this.sun = new THREE.DirectionalLight(0xfff2d2, 2.4)
    this.sun.name = 'sun'
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    this.sun.shadow.camera.near = 0.5
    this.sun.shadow.camera.far = 40
    this.sun.shadow.camera.left = -7
    this.sun.shadow.camera.right = 7
    this.sun.shadow.camera.top = 7
    this.sun.shadow.camera.bottom = -7
    this.sun.shadow.bias = -0.0009
    this.sun.shadow.normalBias = 0.03
    this.sun.shadow.radius = 3
    scene.add(this.sun)
    scene.add(this.sun.target)
    this.sun.target.position.set(0, 0.8, 0)

    // 从窗户斜射进来的一束补光
    this.windowFill = new THREE.PointLight(0xdfefff, 1.5, 9, 2)
    this.windowFill.position.set(-0.1, 1.9, -2.4)
    this.windowFill.name = 'windowFill'
    scene.add(this.windowFill)

    /* ---------------- 房间里的灯 ---------------- */
    this.roomLights = roomLights

    /* ---------------- 状态 ---------------- */
    this.state = {
      ambColor: new THREE.Color(),
      ambIntensity: 0,
      hemiSky: new THREE.Color(),
      hemiGround: new THREE.Color(),
      hemiIntensity: 0,
      sunColor: new THREE.Color(),
      sunIntensity: 0,
      sunPos: new THREE.Vector3(),
      fillIntensity: 0,
      lamp: 0,
      deskLamp: 0,
      ceilingLamp: 0,
      skyTop: new THREE.Color(),
      skyHorizon: new THREE.Color(),
      skyBottom: new THREE.Color(),
      stars: 0,
      exposure: 1,
    }

    this.applyPresetInstant('day')
  }

  targetState(preset) {
    return {
      ambColor: new THREE.Color(preset.ambient.color),
      ambIntensity: preset.ambient.intensity,
      hemiSky: new THREE.Color(preset.hemi.sky),
      hemiGround: new THREE.Color(preset.hemi.ground),
      hemiIntensity: preset.hemi.intensity,
      sunColor: new THREE.Color(preset.sun.color),
      sunIntensity: preset.sun.intensity,
      sunPos: new THREE.Vector3(...preset.sun.position),
      fillIntensity: 0.6 + preset.sun.intensity * 0.5,
      lamp: preset.lamp,
      deskLamp: preset.deskLamp,
      ceilingLamp: preset.ceilingLamp,
      skyTop: new THREE.Color(preset.skyTop),
      skyHorizon: new THREE.Color(preset.skyHorizon),
      skyBottom: new THREE.Color(preset.skyBottom),
      stars: preset.stars,
      exposure: preset.exposure,
    }
  }

  applyPresetInstant(name) {
    const preset = TIME_PRESETS[name] || TIME_PRESETS.day
    const target = this.targetState(preset)
    this.presetName = name
    this.copyState(this.state, target)
    this.applyToScene()
  }

  cloneState(src) {
    const out = {}
    this.copyState(out, src)
    out.ambColor = src.ambColor.clone()
    out.hemiSky = src.hemiSky.clone()
    out.hemiGround = src.hemiGround.clone()
    out.sunColor = src.sunColor.clone()
    out.sunPos = src.sunPos.clone()
    out.skyTop = src.skyTop.clone()
    out.skyHorizon = src.skyHorizon.clone()
    out.skyBottom = src.skyBottom.clone()
    return out
  }

  copyState(dst, src) {
    const putColor = (key) => {
      if (!dst[key]) dst[key] = new THREE.Color()
      dst[key].copy(src[key])
    }
    putColor('ambColor')
    dst.ambIntensity = src.ambIntensity
    putColor('hemiSky')
    putColor('hemiGround')
    dst.hemiIntensity = src.hemiIntensity
    putColor('sunColor')
    dst.sunIntensity = src.sunIntensity
    if (!dst.sunPos) dst.sunPos = new THREE.Vector3()
    dst.sunPos.copy(src.sunPos)
    dst.fillIntensity = src.fillIntensity
    dst.lamp = src.lamp
    dst.deskLamp = src.deskLamp
    dst.ceilingLamp = src.ceilingLamp
    putColor('skyTop')
    putColor('skyHorizon')
    putColor('skyBottom')
    dst.stars = src.stars
    dst.exposure = src.exposure
  }

  /**
   * 平滑切到某个时段。
   * 从「当前实时状态」插值到目标，所以连点切换也不会跳变。
   */
  setPreset(name, { duration = 1400 } = {}) {
    const preset = TIME_PRESETS[name]
    if (!preset) return
    this.presetName = name

    const from = this.cloneState(this.state)
    const to = this.targetState(preset)

    if (this.tween) this.tween.stop()

    const progress = { k: 0 }
    this.tween = new TWEEN.Tween(progress, tweenGroup)
      .to({ k: 1 }, duration)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        const k = progress.k
        this.state.ambColor.copy(from.ambColor).lerp(to.ambColor, k)
        this.state.ambIntensity = THREE.MathUtils.lerp(from.ambIntensity, to.ambIntensity, k)
        this.state.hemiSky.copy(from.hemiSky).lerp(to.hemiSky, k)
        this.state.hemiGround.copy(from.hemiGround).lerp(to.hemiGround, k)
        this.state.hemiIntensity = THREE.MathUtils.lerp(from.hemiIntensity, to.hemiIntensity, k)
        this.state.sunColor.copy(from.sunColor).lerp(to.sunColor, k)
        this.state.sunIntensity = THREE.MathUtils.lerp(from.sunIntensity, to.sunIntensity, k)
        this.state.sunPos.copy(from.sunPos).lerp(to.sunPos, k)
        this.state.fillIntensity = THREE.MathUtils.lerp(from.fillIntensity, to.fillIntensity, k)
        this.state.lamp = THREE.MathUtils.lerp(from.lamp, to.lamp, k)
        this.state.deskLamp = THREE.MathUtils.lerp(from.deskLamp, to.deskLamp, k)
        this.state.ceilingLamp = THREE.MathUtils.lerp(from.ceilingLamp, to.ceilingLamp, k)
        this.state.skyTop.copy(from.skyTop).lerp(to.skyTop, k)
        this.state.skyHorizon.copy(from.skyHorizon).lerp(to.skyHorizon, k)
        this.state.skyBottom.copy(from.skyBottom).lerp(to.skyBottom, k)
        this.state.stars = THREE.MathUtils.lerp(from.stars, to.stars, k)
        this.state.exposure = THREE.MathUtils.lerp(from.exposure, to.exposure, k)
        this.applyToScene()
      })
      .start()
  }

  applyToScene() {
    const s = this.state

    this.ambient.color.copy(s.ambColor)
    this.ambient.intensity = s.ambIntensity

    this.hemi.color.copy(s.hemiSky)
    this.hemi.groundColor.copy(s.hemiGround)
    this.hemi.intensity = s.hemiIntensity

    this.sun.color.copy(s.sunColor)
    this.sun.intensity = s.sunIntensity
    this.sun.position.copy(s.sunPos)
    this.sun.target.position.set(0, 0.9, 0)
    this.sun.target.updateMatrixWorld()

    // 太阳 / 月亮的可视化圆盘放在主光方向 46m 外
    const dir = s.sunPos.clone().normalize()
    this.sunSprite.position.copy(dir).multiplyScalar(46)
    this.sunGlow.position.copy(this.sunSprite.position)
    this.sunSprite.material.color.copy(s.sunColor)
    this.sunGlow.material.color.copy(s.sunColor)

    this.windowFill.intensity = s.fillIntensity
    this.windowFill.color.copy(s.skyHorizon).lerp(new THREE.Color(0xffffff), 0.5)

    this.skyUniforms.topColor.value.copy(s.skyTop)
    this.skyUniforms.horizonColor.value.copy(s.skyHorizon)
    this.skyUniforms.bottomColor.value.copy(s.skyBottom)

    // 白天远景若隐若现，夜晚城市灯火才显出来
    this.skylineMat.opacity = 0.12 + s.stars * 0.86

    this.starMat.opacity = s.stars
    this.sunGlow.material.opacity = 0.35 + (1 - s.stars) * 0.35
    this.sunSprite.material.opacity = s.stars > 0.6 ? 0.9 : 1

    const lights = this.roomLights
    if (lights) {
      if (lights.ceiling) lights.ceiling.intensity = s.ceilingLamp
      if (lights.deskLamp) lights.deskLamp.intensity = this.deskLampOn ? s.deskLamp : 0
      if (lights.bedLamp) lights.bedLamp.intensity = this.bedLampOn ? s.lamp : 0
      if (lights.ceilingShade) lights.ceilingShade.material.emissiveIntensity = s.ceilingLamp * 0.9
      if (lights.deskLampShade) lights.deskLampShade.material.emissiveIntensity = this.deskLampOn ? s.deskLamp * 0.8 : 0
      if (lights.bedLampShade) lights.bedLampShade.material.emissiveIntensity = this.bedLampOn ? s.lamp * 0.8 : 0
    }
    this.currentExposure = s.exposure
  }

  toggleDeskLamp() {
    this.deskLampOn = !this.deskLampOn
    this.applyToScene()
    return this.deskLampOn
  }

  dispose() {
    this.sky.geometry.dispose()
    this.sky.material.dispose()
    this.stars.geometry.dispose()
    this.stars.material.dispose()
  }
}
