import * as THREE from 'three'
import { ROOM, HALF } from './constants'
import {
  makeWoodFloorTexture,
  makeWallTexture,
  makeRugTexture,
  makePosterTexture,
  makeScreenTexture,
  makeBookTexture,
} from './textures'

/**
 * 程序化生成的卧室。
 *
 * 这个文件是「没有 GLB 时的兜底场景」，也是你 Blender 建模的布局参考：
 * 房间 7m x 6m x 2.9m，床在西侧，书桌在东侧，书架和窗在北侧，门在南侧。
 * 交互物体的命名约定（Blender 里也这么命名即可自动被识别）：
 *   PICK_photo_1 / PICK_pc / PICK_book / PICK_radio / PICK_door / PICK_lamp
 */

const PICK_PREFIX = 'PICK_'

export function buildRoom(renderer) {
  const group = new THREE.Group()
  group.name = 'Bedroom'

  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  const colliders = []
  const picks = []

  const addCollider = (minX, maxX, minZ, maxZ) => colliders.push({ minX, maxX, minZ, maxZ })

  /* ---------------------------------------------------------------- */
  /* 材质                                                              */
  /* ---------------------------------------------------------------- */
  const floorTex = makeWoodFloorTexture(aniso)
  const wallTex = makeWallTexture('#e9dcc9', aniso)
  const rugTex = makeRugTexture(aniso)

  const matFloor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.72, metalness: 0.02 })
  const matWall = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95, metalness: 0 })
  const matCeiling = new THREE.MeshStandardMaterial({ color: 0xf7f1e8, roughness: 1 })
  const matWood = new THREE.MeshStandardMaterial({ color: 0x6f4a30, roughness: 0.62, metalness: 0.05 })
  const matWoodDark = new THREE.MeshStandardMaterial({ color: 0x4a3121, roughness: 0.6 })
  const matWoodLight = new THREE.MeshStandardMaterial({ color: 0xcf9d6e, roughness: 0.65 })
  const matFabric = new THREE.MeshStandardMaterial({ color: 0xe8d5c4, roughness: 1 })
  const matFabricPink = new THREE.MeshStandardMaterial({ color: 0xe3b5b4, roughness: 1 })
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xf6f3ee, roughness: 0.55 })
  const matMetal = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.32, metalness: 0.9 })
  const matDarkMetal = new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.4, metalness: 0.75 })
  const matPlastic = new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: 0.55 })
  const matLeaf = new THREE.MeshStandardMaterial({ color: 0x4f8a5b, roughness: 0.85, side: THREE.DoubleSide })
  const matTerracotta = new THREE.MeshStandardMaterial({ color: 0xb9755a, roughness: 0.85 })

  /* ---------------------------------------------------------------- */
  /* 工具函数                                                          */
  /* ---------------------------------------------------------------- */
  function box(w, h, d, mat, x, y, z, parent = group) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  function noShadow(obj) {
    obj.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false
        o.receiveShadow = false
      }
    })
    return obj
  }

  function registerPick(root, data) {
    root.name = PICK_PREFIX + data.id
    root.userData.pick = data
    picks.push({ root, data })
    return root
  }

  /* ---------------------------------------------------------------- */
  /* 地板 / 墙 / 天花板                                                */
  /* ---------------------------------------------------------------- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.width + 0.3, ROOM.depth + 0.3), matFloor)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  floor.name = 'floor'
  group.add(floor)

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.width + 0.3, ROOM.depth + 0.3), matCeiling)
  ceiling.rotation.x = Math.PI / 2
  // 比墙顶低 5mm，避免和墙顶面重合产生 z-fighting 白线
  ceiling.position.y = ROOM.height - 0.005
  ceiling.receiveShadow = false
  // 天花板挡光，这样白天的阳光只会从窗户漏进来（房间才有明暗层次）
  ceiling.castShadow = true
  group.add(ceiling)

  const t = ROOM.wallThickness
  const ow = HALF.x + t // 外墙半宽

  // 北墙（z = -3），中间开窗
  const winW = 2.3
  const winH = 1.45
  const winY = 0.95 // 窗台高度
  const winCenterX = -0.1

  function wallSlab(w, h, d, x, y, z) {
    const mesh = box(w, h, d, matWall, x, y, z)
    // 墙面不接收阴影：平行光在近乎平行的大平面上极易出现 shadow acne（白边/条纹）
    mesh.receiveShadow = false
    return mesh
  }

  // 北墙分段
  const nz = -HALF.z - t / 2
  const leftW = winCenterX - winW / 2 - -ow
  wallSlab(leftW, ROOM.height, t, -ow + leftW / 2, ROOM.height / 2, nz)
  const rightStart = winCenterX + winW / 2
  const rightW = ow - rightStart
  wallSlab(rightW, ROOM.height, t, rightStart + rightW / 2, ROOM.height / 2, nz)
  wallSlab(winW, winY, t, winCenterX, winY / 2, nz)
  const topH = ROOM.height - (winY + winH)
  wallSlab(winW, topH, t, winCenterX, winY + winH + topH / 2, nz)

  // 南墙（z = 3），中间开门
  const doorW = 0.96
  const doorH = 2.08
  const sz = HALF.z + t / 2
  const sLeftW = -doorW / 2 + ow
  wallSlab(sLeftW, ROOM.height, t, -ow + sLeftW / 2, ROOM.height / 2, sz)
  const sRightW = ow - doorW / 2
  wallSlab(sRightW, ROOM.height, t, doorW / 2 + sRightW / 2, ROOM.height / 2, sz)
  wallSlab(doorW, ROOM.height - doorH, t, 0, doorH + (ROOM.height - doorH) / 2, sz)

  // 东墙 / 西墙
  wallSlab(t, ROOM.height, ROOM.depth + 0.3, HALF.x + t / 2, ROOM.height / 2, 0)
  wallSlab(t, ROOM.height, ROOM.depth + 0.3, -HALF.x - t / 2, ROOM.height / 2, 0)

  // 踢脚线
  const skirt = new THREE.MeshStandardMaterial({ color: 0x7c5334, roughness: 0.6 })
  const sk = (w, d, x, z) => box(w, 0.1, d, skirt, x, 0.05, z)
  sk(ROOM.width, 0.03, 0, -HALF.z + 0.015)
  sk(ROOM.width, 0.03, 0, HALF.z - 0.015)
  sk(0.03, ROOM.depth, -HALF.x + 0.015, 0)
  sk(0.03, ROOM.depth, HALF.x - 0.015, 0)

  /* ---------------------------------------------------------------- */
  /* 窗户：窗框 + 玻璃 + 窗台 + 窗帘                                    */
  /* ---------------------------------------------------------------- */
  const windowGroup = new THREE.Group()
  windowGroup.position.set(winCenterX, winY + winH / 2, -HALF.z)
  group.add(windowGroup)

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xf2ece2, roughness: 0.5 })
  const fw = 0.07
  // 外框
  box(winW, fw, t + 0.02, frameMat, 0, winH / 2 - fw / 2, 0, windowGroup)
  box(winW, fw, t + 0.02, frameMat, 0, -winH / 2 + fw / 2, 0, windowGroup)
  box(fw, winH, t + 0.02, frameMat, -winW / 2 + fw / 2, 0, 0, windowGroup)
  box(fw, winH, t + 0.02, frameMat, winW / 2 - fw / 2, 0, 0, windowGroup)
  // 中梃
  box(0.05, winH - fw * 2, t + 0.02, frameMat, 0, 0, 0, windowGroup)
  box(winW - fw * 2, 0.05, t + 0.02, frameMat, 0, 0.05, 0, windowGroup)

  // 玻璃
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(winW - fw * 2, winH - fw * 2),
    new THREE.MeshPhysicalMaterial({
      color: 0xdcefff,
      transparent: true,
      opacity: 0.12,
      roughness: 0.06,
      metalness: 0,
      transmission: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  )
  glass.position.z = 0.01
  windowGroup.add(glass)
  noShadow(windowGroup)

  // 窗台
  box(winW + 0.24, 0.06, 0.28, matWhite, winCenterX, winY - 0.03, -HALF.z + 0.14)

  // 窗帘杆
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, winW + 0.7, 12), matMetal)
  rod.rotation.z = Math.PI / 2
  rod.position.set(winCenterX, winY + winH + 0.16, -HALF.z + 0.17)
  rod.castShadow = true
  group.add(rod)

  // 两侧的帘布（用缩放过的圆柱做出褶皱感）
  const curtainMat = new THREE.MeshStandardMaterial({ color: 0xf0e2d2, roughness: 1, side: THREE.DoubleSide })
  ;[-1, 1].forEach((side) => {
    const curtain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.22, winH + 0.34, 20, 1, true, 0, Math.PI),
      curtainMat
    )
    curtain.position.set(winCenterX + side * (winW / 2 + 0.12), winY + winH / 2 + 0.06, -HALF.z + 0.16)
    curtain.rotation.y = Math.PI / 2
    curtain.scale.set(0.5, 1, 1.15)
    curtain.castShadow = true
    group.add(curtain)
  })

  /* ---------------------------------------------------------------- */
  /* 门                                                                */
  /* ---------------------------------------------------------------- */
  const doorGroup = new THREE.Group()
  doorGroup.position.set(0, 0, HALF.z)
  group.add(doorGroup)

  box(0.09, doorH + 0.09, 0.14, frameMat, -doorW / 2 - 0.045, (doorH + 0.09) / 2, 0.02, doorGroup)
  box(0.09, doorH + 0.09, 0.14, frameMat, doorW / 2 + 0.045, (doorH + 0.09) / 2, 0.02, doorGroup)
  box(doorW + 0.18, 0.09, 0.14, frameMat, 0, doorH + 0.045, 0.02, doorGroup)

  const doorLeaf = box(doorW - 0.02, doorH - 0.02, 0.05, matWood, 0, doorH / 2, -0.02, doorGroup)
  doorLeaf.name = 'doorLeaf'
  // 门板装饰
  box(doorW - 0.32, 0.02, 0.06, matWoodDark, 0, doorH * 0.72, -0.02, doorGroup)
  // 把手
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), matMetal)
  handle.position.set(-doorW / 2 + 0.14, 1.02, -0.06)
  handle.castShadow = true
  doorGroup.add(handle)
  const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 8), matMetal)
  handleBar.rotation.x = Math.PI / 2
  handleBar.position.set(-doorW / 2 + 0.14, 1.02, -0.035)
  doorGroup.add(handleBar)

  const doorPick = new THREE.Group()
  doorGroup.add(doorPick)
  doorPick.position.set(0, 1.1, 0)
  registerPick(doorPick, {
    id: 'door',
    type: 'door',
    label: '房门',
    hint: '点击 · 看看门后',
    title: '门后的世界',
    text: '这里以后可以接第二个房间（Portal）。在 Blender 里再做一个 room-2.glb，点门就传送过去。',
  })
  // 交互热区（不可见）
  const doorHit = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.2), new THREE.MeshBasicMaterial({ visible: false }))
  doorHit.position.y = doorH / 2
  doorPick.add(doorHit)
  doorPick.position.set(0, 0, 0)

  /* ---------------------------------------------------------------- */
  /* 地毯                                                              */
  /* ---------------------------------------------------------------- */
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.28, 48), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 }))
  rug.rotation.x = -Math.PI / 2
  rug.position.set(0.35, 0.006, 0.15)
  rug.receiveShadow = true
  group.add(rug)

  /* ---------------------------------------------------------------- */
  /* 床（西侧）                                                        */
  /* ---------------------------------------------------------------- */
  const bed = new THREE.Group()
  bed.position.set(-HALF.x + 1.03, 0, 0)
  group.add(bed)

  // 床架
  box(2.06, 0.24, 1.52, matWoodDark, 0, 0.14, 0, bed)
  // 床垫
  box(2.0, 0.26, 1.46, matFabric, 0, 0.39, 0, bed)
  // 被子
  const quilt = box(1.35, 0.16, 1.5, matFabricPink, 0.3, 0.52, 0, bed)
  quilt.scale.set(1, 1, 1.02)
  // 枕头
  ;[-0.36, 0.36].forEach((z) => {
    const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), matWhite)
    pillow.scale.set(1.05, 0.36, 0.72)
    pillow.position.set(-0.74, 0.55, z)
    pillow.castShadow = true
    bed.add(pillow)
  })
  // 床头板（贴西墙）
  box(0.12, 1.0, 1.6, matWood, -1.03, 0.5, 0, bed)
  // 床尾搭毯
  box(0.5, 0.06, 1.52, new THREE.MeshStandardMaterial({ color: 0x9fb3c8, roughness: 1 }), 0.72, 0.55, 0, bed)

  addCollider(-HALF.x, -HALF.x + 2.1, -0.79, 0.79)

  /* ---------------------------------------------------------------- */
  /* 床头柜 + 床头灯                                                   */
  /* ---------------------------------------------------------------- */
  const nightstand = new THREE.Group()
  nightstand.position.set(-HALF.x + 0.35, 0, -1.55)
  group.add(nightstand)
  box(0.62, 0.52, 0.5, matWood, 0, 0.26, 0, nightstand)
  box(0.58, 0.03, 0.03, matMetal, 0, 0.38, 0.26, nightstand)
  box(0.04, 0.12, 0.04, matDarkMetal, 0, 0.06, 0.16, nightstand)
  box(0.04, 0.12, 0.04, matDarkMetal, 0, 0.06, -0.16, nightstand)
  addCollider(-HALF.x, -HALF.x + 0.68, -1.81, -1.29)

  // 床头小灯
  const bedLampGroup = new THREE.Group()
  bedLampGroup.position.set(-HALF.x + 0.35, 0.52, -1.62)
  group.add(bedLampGroup)
  const bedLampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.04, 20), matDarkMetal)
  bedLampBase.position.y = 0.02
  bedLampGroup.add(bedLampBase)
  const bedLampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 10), matMetal)
  bedLampStem.position.y = 0.15
  bedLampGroup.add(bedLampStem)
  const bedLampShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.13, 0.15, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xffe9c9, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xffb45c, emissiveIntensity: 0 })
  )
  bedLampShade.position.y = 0.32
  bedLampGroup.add(bedLampShade)
  const bedLampLight = new THREE.PointLight(0xffb066, 0.0, 3.6, 2)
  bedLampLight.position.set(-HALF.x + 0.35, 0.9, -1.62)
  group.add(bedLampLight)

  /* ---------------------------------------------------------------- */
  /* 书桌（东侧）                                                      */
  /* ---------------------------------------------------------------- */
  const desk = new THREE.Group()
  desk.position.set(HALF.x - 0.34, 0, -0.05)
  group.add(desk)

  // 桌面
  box(0.68, 0.045, 1.9, matWoodLight, 0, 0.75, 0, desk)
  // 桌腿
  ;[-0.28, 0.28].forEach((x) => {
    ;[-0.86, 0.86].forEach((z) => box(0.05, 0.73, 0.05, matDarkMetal, x, 0.365, z, desk))
  })
  // 抽屉柜
  box(0.6, 0.42, 0.5, matWood, 0, 0.52, -0.6, desk)
  box(0.5, 0.02, 0.02, matMetal, 0, 0.66, -0.35, desk)
  box(0.5, 0.02, 0.02, matMetal, 0, 0.5, -0.35, desk)

  addCollider(HALF.x - 0.72, HALF.x, -1.02, 0.92)

  // 椅子
  const chair = new THREE.Group()
  chair.name = 'chair'
  chair.position.set(2.55, 0, 0.18)
  chair.rotation.y = Math.PI / 2 + 0.14
  group.add(chair)
  const matCushion = new THREE.MeshStandardMaterial({ color: 0x8fa3b8, roughness: 0.95 })
  const seat = box(0.44, 0.09, 0.44, matCushion, 0, 0.44, 0, chair)
  seat.geometry.translate(0, 0, 0)
  const chairBack = box(0.4, 0.32, 0.06, matCushion, 0, 0.62, -0.2, chair)
  chairBack.rotation.x = -0.08
  box(0.4, 0.02, 0.06, matDarkMetal, 0, 0.48, -0.19, chair)
  // 四条细腿
  ;[-0.18, 0.18].forEach((x) => {
    ;[-0.18, 0.18].forEach((z) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, 0.42, 8), matDarkMetal)
      leg.position.set(x, 0.21, z)
      leg.castShadow = true
      chair.add(leg)
    })
  })
  addCollider(2.36, 2.9, -0.08, 0.44)

  /* ---------------------------------------------------------------- */
  /* 显示器（可点击 → 跳转链接）                                        */
  /* ---------------------------------------------------------------- */
  const pcGroup = new THREE.Group()
  pcGroup.position.set(HALF.x - 0.28, 0.775, -0.05)
  pcGroup.rotation.y = -Math.PI / 2
  group.add(pcGroup)

  const screenTex = makeScreenTexture(aniso)
  const monitor = new THREE.Group()
  pcGroup.add(monitor)

  const bezel = box(0.72, 0.44, 0.03, matPlastic, 0, 0.31, 0, monitor)
  bezel.castShadow = true
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissive: 0xffffff,
    emissiveMap: screenTex,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0,
  })
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.67, 0.385), screenMat)
  screen.position.set(0, 0.31, 0.017)
  monitor.add(screen)
  const standNeck = box(0.05, 0.14, 0.05, matDarkMetal, 0, 0.07, 0.03, monitor)
  standNeck.castShadow = false
  box(0.26, 0.015, 0.16, matDarkMetal, 0, 0.008, 0.05, monitor)

  const pcPick = new THREE.Group()
  pcPick.position.y = 0.31
  monitor.add(pcPick)
  const pcHit = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.46, 0.1), new THREE.MeshBasicMaterial({ visible: false }))
  pcHit.position.z = 0.02
  pcPick.add(pcHit)
  registerPick(pcPick, {
    id: 'pc',
    type: 'link',
    label: '电脑',
    hint: '点击 · 打开我的主页',
    title: '我的电脑',
    url: 'https://github.com/',
  })

  // 键盘 + 鼠标
  box(0.4, 0.02, 0.14, matPlastic, -0.02, 0.775, 0.24, desk)
  box(0.2, 0.008, 0.11, matDarkMetal, -0.02, 0.786, 0.24, desk)
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), matPlastic)
  mouse.scale.set(1, 0.45, 1.4)
  mouse.position.set(0.26, 0.795, 0.26)
  desk.add(mouse)
  // 杯子
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.11, 20), matWhite)
  cup.position.set(0.2, 0.83, -0.28)
  cup.castShadow = true
  desk.add(cup)
  // 手办（书桌角落）
  const figure = new THREE.Group()
  figure.position.set(0.24, 0.775, -0.78)
  desk.add(figure)
  const figBody = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 16), new THREE.MeshStandardMaterial({ color: 0x6ec6ff, roughness: 0.4 }))
  figBody.position.y = 0.08
  figBody.castShadow = true
  figure.add(figBody)
  const figHead = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 16), new THREE.MeshStandardMaterial({ color: 0xffe0c4, roughness: 0.5 }))
  figHead.position.y = 0.2
  figHead.castShadow = true
  figure.add(figHead)
  const figHair = new THREE.Mesh(new THREE.SphereGeometry(0.052, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: 0x3b3f8f, roughness: 0.5 }))
  figHair.position.y = 0.205
  figure.add(figHair)
  addCollider(HALF.x - 0.62, HALF.x, -0.9, -0.62)

  /* ---------------------------------------------------------------- */
  /* 台灯（可点击开关）                                                 */
  /* ---------------------------------------------------------------- */
  const lampGroup = new THREE.Group()
  lampGroup.position.set(HALF.x - 0.32, 0.775, -0.82)
  group.add(lampGroup)

  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.03, 20), matDarkMetal)
  lampBase.position.y = 0.015
  lampGroup.add(lampBase)
  const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.42, 12), matMetal)
  lampArm.position.y = 0.22
  lampGroup.add(lampArm)
  const lampArm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 12), matMetal)
  lampArm2.rotation.z = Math.PI / 2.6
  lampArm2.position.set(-0.1, 0.43, 0)
  lampGroup.add(lampArm2)
  const lampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.115, 0.16, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xf4e6d2, roughness: 0.5, side: THREE.DoubleSide, emissive: 0xffd9a0, emissiveIntensity: 0 })
  )
  lampShade.position.set(-0.19, 0.42, 0)
  lampShade.rotation.z = 0.5
  lampGroup.add(lampShade)

  const deskLampLight = new THREE.PointLight(0xffc98a, 0, 4.2, 2)
  deskLampLight.position.set(-0.19, 0.34, 0)
  lampGroup.add(deskLampLight)

  const lampPick = new THREE.Group()
  lampPick.position.y = 0.3
  lampGroup.add(lampPick)
  const lampHit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.3), new THREE.MeshBasicMaterial({ visible: false }))
  lampPick.add(lampHit)
  registerPick(lampPick, {
    id: 'lamp',
    type: 'lamp',
    label: '台灯',
    hint: '点击 · 开 / 关',
  })

  /* ---------------------------------------------------------------- */
  /* 书架（北墙东侧）                                                  */
  /* ---------------------------------------------------------------- */
  const shelf = new THREE.Group()
  shelf.position.set(2.02, 0, -HALF.z + 0.19)
  group.add(shelf)

  const shelfW = 1.5
  const shelfH = 2.02
  const shelfD = 0.34
  box(0.04, shelfH, shelfD, matWood, -shelfW / 2, shelfH / 2, 0, shelf)
  box(0.04, shelfH, shelfD, matWood, shelfW / 2, shelfH / 2, 0, shelf)
  box(shelfW, 0.04, shelfD, matWood, 0, shelfH, 0, shelf)
  box(shelfW, 0.03, shelfD, matWood, 0, 0.02, 0, shelf)
  const shelfLevels = [0.42, 0.86, 1.3, 1.74]
  shelfLevels.forEach((y) => box(shelfW, 0.03, shelfD, matWood, 0, y, 0, shelf))
  // 背板
  const back = new THREE.Mesh(new THREE.PlaneGeometry(shelfW, shelfH), new THREE.MeshStandardMaterial({ color: 0xd8c2a8, roughness: 1 }))
  back.position.set(0, shelfH / 2, -shelfD / 2 + 0.01)
  shelf.add(back)

  addCollider(1.26, 2.78, -HALF.z, -HALF.z + 0.4)

  // 书（InstancedMesh 省 drawcall）
  const bookColors = [0xb98a86, 0x8b9fb9, 0xc0b28a, 0x8fa88e, 0xa08fb0, 0xc0a292, 0x86a8a4, 0xb4ab9e]
  const bookGeo = new THREE.BoxGeometry(0.055, 0.22, 0.2)
  const bookMat = new THREE.MeshStandardMaterial({ roughness: 0.85 })
  const perShelf = 22
  const books = new THREE.InstancedMesh(bookGeo, bookMat, perShelf * 4)
  books.castShadow = true
  books.receiveShadow = true
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  let idx = 0
  shelfLevels.forEach((level) => {
    let x = -shelfW / 2 + 0.06
    for (let i = 0; i < perShelf; i++) {
      const w = 0.045 + Math.random() * 0.03
      const h = 0.17 + Math.random() * 0.08
      dummy.position.set(x + w / 2, level + 0.02 + h / 2, 0)
      dummy.rotation.set(0, 0, Math.random() > 0.94 ? (Math.random() - 0.5) * 0.35 : 0)
      dummy.scale.set(w / 0.055, h / 0.22, 0.85 + Math.random() * 0.3)
      dummy.updateMatrix()
      books.setMatrixAt(idx, dummy.matrix)
      color.setHex(bookColors[Math.floor(Math.random() * bookColors.length)])
      books.setColorAt(idx, color)
      idx++
      x += w + 0.012
      if (x > shelfW / 2 - 0.1) break
    }
  })
  books.count = idx
  books.instanceMatrix.needsUpdate = true
  if (books.instanceColor) books.instanceColor.needsUpdate = true
  shelf.add(books)

  /* ---------------------------------------------------------------- */
  /* 收音机（可点击播放 BGM）                                           */
  /* ---------------------------------------------------------------- */
  const radio = new THREE.Group()
  radio.position.set(1.45, 0.88, -HALF.z + 0.19)
  group.add(radio)
  const radioBody = box(0.3, 0.18, 0.14, new THREE.MeshStandardMaterial({ color: 0xc98f5e, roughness: 0.6 }), 0, 0.09, 0, radio)
  radioBody.castShadow = true
  const speaker = new THREE.Mesh(
    new THREE.CircleGeometry(0.055, 24),
    new THREE.MeshStandardMaterial({ color: 0x3a2b22, roughness: 0.9 })
  )
  speaker.position.set(-0.06, 0.09, 0.071)
  radio.add(speaker)
  const radioKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 16), matMetal)
  radioKnob.rotation.x = Math.PI / 2
  radioKnob.position.set(0.09, 0.12, 0.075)
  radio.add(radioKnob)
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 6), matMetal)
  antenna.position.set(0.1, 0.31, 0)
  antenna.rotation.z = -0.25
  radio.add(antenna)

  const radioPick = new THREE.Group()
  radioPick.position.y = 0.09
  radio.add(radioPick)
  const radioHit = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.22), new THREE.MeshBasicMaterial({ visible: false }))
  radioPick.add(radioHit)
  registerPick(radioPick, {
    id: 'radio',
    type: 'radio',
    label: '收音机',
    hint: '点击 · 播放 BGM',
  })

  /* ---------------------------------------------------------------- */
  /* 留言簿（书桌上，可点击留言）                                       */
  /* ---------------------------------------------------------------- */
  const bookGroup = new THREE.Group()
  bookGroup.position.set(HALF.x - 0.36, 0.78, 0.55)
  bookGroup.rotation.y = -Math.PI / 2 + 0.12
  group.add(bookGroup)

  const bookTex = makeBookTexture(aniso)
  const coverMat = new THREE.MeshStandardMaterial({ map: bookTex, roughness: 0.7 })
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xf7f0e2, roughness: 0.95 })
  // 材质顺序 +X -X +Y -Y +Z -Z：只有顶面用封面贴图，其余是书页白
  const bookMats = [pageMat, pageMat, coverMat, pageMat, pageMat, pageMat]
  const bookBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.3), bookMats)
  bookBody.position.y = 0.026
  bookBody.rotation.z = 0.02
  bookBody.castShadow = true
  bookGroup.add(bookBody)

  const bookPick = new THREE.Group()
  bookPick.position.y = 0.04
  bookGroup.add(bookPick)
  const bookHit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.36), new THREE.MeshBasicMaterial({ visible: false }))
  bookPick.add(bookHit)
  registerPick(bookPick, {
    id: 'book',
    type: 'book',
    label: '留言簿',
    hint: '点击 · 写下留言',
  })

  /* ---------------------------------------------------------------- */
  /* 墙上的画框                                                        */
  /* ---------------------------------------------------------------- */
  function makeFrame(w, h, tex, data, position, rotationY) {
    const root = new THREE.Group()
    root.position.copy(position)
    root.rotation.y = rotationY
    group.add(root)

    const frameMat2 = new THREE.MeshStandardMaterial({ color: 0x8d6a4a, roughness: 0.6 })
    box(w + 0.08, h + 0.08, 0.03, frameMat2, 0, 0, 0, root)
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })
    )
    art.position.z = 0.018
    root.add(art)

    const pick = new THREE.Group()
    root.add(pick)
    const hit = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.08), new THREE.MeshBasicMaterial({ visible: false }))
    pick.add(hit)
    const dataUrl = tex.image && tex.image.toDataURL ? tex.image.toDataURL('image/jpeg', 0.92) : null
    registerPick(pick, {
      id: data.id,
      type: 'photo',
      label: '照片',
      hint: '点击 · 放大查看',
      title: data.title,
      caption: data.caption,
      image: dataUrl,
    })
    return root
  }

  const poster0 = makePosterTexture(0, aniso)
  const poster1 = makePosterTexture(1, aniso)
  const poster2 = makePosterTexture(2, aniso)
  const poster3 = makePosterTexture(3, aniso)
  const poster4 = makePosterTexture(4, aniso)

  // 床头墙（西墙）— 两张竖幅
  makeFrame(0.58, 0.72, poster0, { id: 'photo-1', title: 'Night Walk', caption: '深夜散步时看到的天空，一直想画下来。' }, new THREE.Vector3(-HALF.x + 0.03, 1.75, -0.42), Math.PI / 2)
  makeFrame(0.58, 0.72, poster3, { id: 'photo-2', title: 'Sakura Night', caption: '樱花季的夜晚，粉色比白天更好看。' }, new THREE.Vector3(-HALF.x + 0.03, 1.75, 0.46), Math.PI / 2)

  // 北墙窗左侧
  makeFrame(0.56, 0.7, poster1, { id: 'photo-3', title: 'Golden Hour', caption: '黄昏的金色，是这个房间最贵的装饰。' }, new THREE.Vector3(-1.85, 1.68, -HALF.z + 0.03), 0)

  // 东墙（书桌上方）横向
  makeFrame(0.76, 0.52, poster2, { id: 'photo-4', title: 'Seaside', caption: '下次旅行想去看海。' }, new THREE.Vector3(HALF.x - 0.03, 1.86, -0.6), -Math.PI / 2)

  // 南墙
  makeFrame(0.64, 0.5, poster4, { id: 'photo-5', title: 'Blue Room', caption: '把这里命名为「蓝色房间」。' }, new THREE.Vector3(1.6, 1.7, HALF.z - 0.03), Math.PI)

  /* ---------------------------------------------------------------- */
  /* 吊灯                                                              */
  /* ---------------------------------------------------------------- */
  const ceilingLamp = new THREE.Group()
  ceilingLamp.position.set(0.1, ROOM.height, -0.1)
  group.add(ceilingLamp)
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.55, 6), matDarkMetal)
  cord.position.y = -0.275
  ceilingLamp.add(cord)
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.27, 0.22, 32, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xfdf3e4,
      roughness: 0.5,
      side: THREE.DoubleSide,
      emissive: 0xffd6a0,
      emissiveIntensity: 0,
    })
  )
  shade.position.y = -0.66
  ceilingLamp.add(shade)
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff2d0, emissive: 0xffd28a, emissiveIntensity: 1.1 })
  )
  bulb.position.y = -0.7
  ceilingLamp.add(bulb)
  const ceilingLight = new THREE.PointLight(0xffd9a8, 0.4, 9, 1.6)
  ceilingLight.position.set(0.1, ROOM.height - 0.75, -0.1)
  group.add(ceilingLight)

  /* ---------------------------------------------------------------- */
  /* 植物（西北角）                                                    */
  /* ---------------------------------------------------------------- */
  const plant = new THREE.Group()
  plant.position.set(-HALF.x + 0.42, 0, -HALF.z + 0.45)
  group.add(plant)
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.28, 20), matTerracotta)
  pot.position.y = 0.14
  pot.castShadow = true
  plant.add(pot)
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x6b5030 }))
  trunk.position.y = 0.5
  plant.add(trunk)
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.1), matLeaf)
    const a = (i / 9) * Math.PI * 2
    leaf.position.set(Math.cos(a) * 0.12, 0.72 + Math.sin(i * 1.7) * 0.16, Math.sin(a) * 0.12)
    leaf.rotation.set(Math.random() * 0.5, a, 0.6 + Math.random() * 0.4)
    leaf.castShadow = true
    plant.add(leaf)
  }
  addCollider(-HALF.x, -HALF.x + 0.6, -HALF.z, -HALF.z + 0.62)

  /* ---------------------------------------------------------------- */
  /* 豆袋沙发（东南角）                                                 */
  /* ---------------------------------------------------------------- */
  const beanbag = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 26, 18),
    new THREE.MeshStandardMaterial({ color: 0xc9a99a, roughness: 1 })
  )
  beanbag.name = 'beanbag'
  beanbag.scale.set(1.1, 0.55, 1)
  beanbag.position.set(2.55, 0.24, 2.28)
  beanbag.castShadow = true
  beanbag.receiveShadow = true
  group.add(beanbag)
  addCollider(1.95, 2.95, 1.72, 2.72)

  /* ---------------------------------------------------------------- */
  group.traverse((o) => {
    if (o.isMesh) {
      o.frustumCulled = true
    }
  })

  return {
    group,
    colliders,
    picks,
    lights: {
      ceiling: ceilingLight,
      deskLamp: deskLampLight,
      bedLamp: bedLampLight,
      ceilingShade: shade,
      deskLampShade: lampShade,
      bedLampShade: bedLampShade,
      screenMat,
    },
    bounds: { minX: -HALF.x, maxX: HALF.x, minZ: -HALF.z, maxZ: HALF.z },
  }
}
