import * as THREE from 'three'

/**
 * 全部贴图都由 Canvas 程序化生成 —— 这样即使你还没有美术资源，
 * 小屋也是「有内容」的。等你有了真实照片/插画，直接替换成
 * public/images/xxx.webp 再用 TextureLoader 即可。
 */

const FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", system-ui, sans-serif'

function createCanvas(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
}

/** 固定种子的伪随机，保证每次刷新画面一致 */
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function toTexture(canvas, { repeat = [1, 1], srgb = true, anisotropy = 8 } = {}) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat[0], repeat[1])
  texture.anisotropy = anisotropy
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/* ------------------------------------------------------------------ */
/* 地板：木条拼花                                                       */
/* ------------------------------------------------------------------ */
export function makeWoodFloorTexture(anisotropy = 8) {
  const size = 1024
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const rand = mulberry32(20240601)

  ctx.fillStyle = '#b08256'
  ctx.fillRect(0, 0, size, size)

  const plankH = size / 6
  for (let row = 0; row < 6; row++) {
    const y = row * plankH
    const offset = (row % 2) * (size / 4)
    // 每块木板的底色微差
    const tone = 0.88 + rand() * 0.22
    const r = Math.round(196 * tone)
    const g = Math.round(148 * tone)
    const b = Math.round(98 * tone)
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
    ctx.fillRect(0, y, size, plankH - 1)

    // 随机木纹
    for (let i = 0; i < 90; i++) {
      const gy = y + rand() * plankH
      ctx.strokeStyle = `rgba(${Math.round(r * 0.72)}, ${Math.round(g * 0.68)}, ${Math.round(
        b * 0.62
      )}, ${0.04 + rand() * 0.1})`
      ctx.lineWidth = 0.6 + rand() * 2.4
      ctx.beginPath()
      ctx.moveTo(0, gy)
      for (let x = 0; x <= size; x += 32) {
        ctx.lineTo(x, gy + Math.sin((x + offset + i * 37) * 0.007) * 3.5)
      }
      ctx.stroke()
    }

    // 拼接缝
    ctx.fillStyle = 'rgba(60, 38, 22, 0.35)'
    ctx.fillRect(0, y + plankH - 2, size, 2)
    ctx.fillRect(offset, y, 2, plankH)
  }

  return toTexture(canvas, { repeat: [3, 3], anisotropy })
}

/* ------------------------------------------------------------------ */
/* 墙面：奶油色微颗粒                                                   */
/* ------------------------------------------------------------------ */
export function makeWallTexture(base = '#f2e9dd', anisotropy = 8) {
  const size = 512
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const rand = mulberry32(99127)

  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 18000; i++) {
    const x = rand() * size
    const y = rand() * size
    const a = rand() * 0.05
    ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(150,130,110,${a})`
    ctx.fillRect(x, y, 1.6, 1.6)
  }

  // 极淡的竖向墙纸条纹
  for (let x = 0; x < size; x += 64) {
    ctx.fillStyle = 'rgba(120, 100, 80, 0.03)'
    ctx.fillRect(x, 0, 1, size)
  }

  return toTexture(canvas, { repeat: [2, 1], anisotropy })
}

/* ------------------------------------------------------------------ */
/* 地毯                                                                 */
/* ------------------------------------------------------------------ */
export function makeRugTexture(anisotropy = 8) {
  const size = 512
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const rand = mulberry32(555)

  ctx.fillStyle = '#d7c4ae'
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = 'rgba(196, 148, 140, 0.55)'
  ctx.lineWidth = 10
  ctx.strokeRect(28, 28, size - 56, size - 56)
  ctx.strokeStyle = 'rgba(150, 170, 190, 0.45)'
  ctx.lineWidth = 5
  ctx.strokeRect(52, 52, size - 104, size - 104)

  // 小星星图案
  for (let i = 0; i < 46; i++) {
    const x = 80 + rand() * (size - 160)
    const y = 80 + rand() * (size - 160)
    ctx.fillStyle = `rgba(214, 170, 150, ${0.35 + rand() * 0.4})`
    ctx.beginPath()
    for (let p = 0; p < 4; p++) {
      const angle = (p / 4) * Math.PI * 2
      ctx.lineTo(x + Math.cos(angle) * 9, y + Math.sin(angle) * 9)
      const angle2 = angle + Math.PI / 4
      ctx.lineTo(x + Math.cos(angle2) * 3.5, y + Math.sin(angle2) * 3.5)
    }
    ctx.closePath()
    ctx.fill()
  }

  // 绒毛噪点
  for (let i = 0; i < 12000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.05})`
    ctx.fillRect(rand() * size, rand() * size, 2, 2)
  }

  return toTexture(canvas, { repeat: [1, 1], anisotropy })
}

/* ------------------------------------------------------------------ */
/* 插画海报（给相框 / 挂画用）                                          */
/* ------------------------------------------------------------------ */
const POSTER_THEMES = [
  { sky: ['#1b2a6b', '#5b6ec4', '#f5a3a0'], sun: '#ffd9a0', hill: ['#2a3566', '#1a2247'], title: 'Night Walk' },
  { sky: ['#ffb26b', '#ff8f8f', '#ffe2b8'], sun: '#fff3c4', hill: ['#a45c7a', '#6d3f63'], title: 'Golden Hour' },
  { sky: ['#0f3d4a', '#2f8f9d', '#bdece0'], sun: '#e8fff4', hill: ['#17545e', '#0b3239'], title: 'Seaside' },
  { sky: ['#2b1b46', '#7e4f9c', '#ffc2d6'], sun: '#ffe0ef', hill: ['#3d2458', '#25153a'], title: 'Sakura Night' },
  { sky: ['#0b1f3a', '#1f4f7a', '#7fd3ff'], sun: '#dff6ff', hill: ['#12324f', '#0a2135'], title: 'Blue Room' },
]

export function makePosterTexture(index = 0, anisotropy = 8) {
  const theme = POSTER_THEMES[index % POSTER_THEMES.length]
  const w = 512
  const h = 640
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')
  const rand = mulberry32(1000 + index * 77)

  // 天空渐变
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, theme.sky[0])
  sky.addColorStop(0.55, theme.sky[1])
  sky.addColorStop(1, theme.sky[2])
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // 星星
  for (let i = 0; i < 90; i++) {
    const x = rand() * w
    const y = rand() * h * 0.6
    const r = rand() * 1.8 + 0.4
    ctx.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.7})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // 发光圆体（太阳 / 月亮）
  const sunX = w * 0.68
  const sunY = h * 0.34
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 190)
  glow.addColorStop(0, 'rgba(255,255,255,0.95)')
  glow.addColorStop(0.18, theme.sun)
  glow.addColorStop(0.5, 'rgba(255,255,255,0.16)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(sunX, sunY, 190, 0, Math.PI * 2)
  ctx.fill()

  // 山丘层
  const layers = [
    { y: h * 0.62, amp: 46, color: theme.hill[0], alpha: 0.85 },
    { y: h * 0.75, amp: 62, color: theme.hill[1], alpha: 1 },
  ]
  layers.forEach((layer, li) => {
    ctx.beginPath()
    ctx.moveTo(0, h)
    ctx.lineTo(0, layer.y)
    for (let x = 0; x <= w; x += 8) {
      const y =
        layer.y +
        Math.sin(x * 0.006 + li * 2.2) * layer.amp * 0.6 +
        Math.sin(x * 0.017 + li) * layer.amp * 0.28
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.globalAlpha = layer.alpha
    ctx.fillStyle = layer.color
    ctx.fill()
    ctx.globalAlpha = 1
  })

  // 水面反光
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  for (let i = 0; i < 26; i++) {
    const y = h * 0.8 + rand() * h * 0.16
    ctx.fillRect(rand() * w * 0.6, y, 40 + rand() * 120, 1.5)
  }

  // 飞鸟
  ctx.strokeStyle = 'rgba(20,20,30,0.55)'
  ctx.lineWidth = 2
  for (let i = 0; i < 5; i++) {
    const bx = 60 + rand() * (w - 200)
    const by = 100 + rand() * 160
    const s = 6 + rand() * 6
    ctx.beginPath()
    ctx.moveTo(bx - s, by)
    ctx.quadraticCurveTo(bx - s / 2, by - s * 0.6, bx, by)
    ctx.quadraticCurveTo(bx + s / 2, by - s * 0.6, bx + s, by)
    ctx.stroke()
  }

  // 底部标题
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.fillRect(0, h - 86, w, 86)
  ctx.fillStyle = 'rgba(255,255,255,0.94)'
  ctx.font = `600 30px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText(theme.title, w / 2, h - 32)
  ctx.font = `400 16px ${FONT}`
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillText('POSTER · 2026', w / 2, h - 12)

  // 纸面噪点
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.03})`
    ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5)
  }

  return toTexture(canvas, { repeat: [1, 1], anisotropy })
}

/* ------------------------------------------------------------------ */
/* 显示器屏幕：伪代码编辑器                                             */
/* ------------------------------------------------------------------ */
export function makeScreenTexture(anisotropy = 8) {
  const w = 1024
  const h = 576
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#111726')
  bg.addColorStop(1, '#1b2440')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // 顶栏
  ctx.fillStyle = '#0b0f1a'
  ctx.fillRect(0, 0, w, 44)
  const dots = ['#ff5f57', '#febc2e', '#28c840']
  dots.forEach((c, i) => {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(26 + i * 26, 22, 8, 0, Math.PI * 2)
    ctx.fill()
  })

  // 侧边栏
  ctx.fillStyle = '#0e1420'
  ctx.fillRect(0, 44, 190, h - 44)
  ctx.font = `500 15px ui-monospace, "Cascadia Code", Consolas, monospace`
  const files = ['src/', '  App.vue', '  main.js', '  three/', '    scene.js', '  style.css', 'vite.config.js']
  files.forEach((f, i) => {
    ctx.fillStyle = i === 2 ? 'rgba(120,180,255,0.18)' : 'transparent'
    ctx.fillRect(10, 66 + i * 30, 170, 26)
    ctx.fillStyle = f.trim().endsWith('/') ? '#8fb7ff' : 'rgba(220,230,255,0.75)'
    ctx.fillText(f, 20, 84 + i * 30)
  })

  // 代码行
  const lines = [
    ['import', ' * as THREE ', 'from', " 'three'"],
    [''],
    ['const', ' scene ', '= ', 'new', ' THREE.Scene()', ''],
    ['const', ' camera ', '= ', 'new', ' THREE.PerspectiveCamera(', '55', ', w/h', ')'],
    [''],
    ['// 欢迎来到我的卧室 ✨'],
    ['function', ' welcome', '(', 'visitor', ') {', ''],
    ['  ', 'console', '.log(', "'hi, ", 'visitor', "'", ')', ''],
    ['  ', 'return', " 'take a look around'", ''],
    ['}'],
    [''],
    ['renderer', '.', 'setAnimationLoop', '(', 'animate', ')'],
  ]
  const colors = {
    kw: '#c792ea',
    str: '#c3e88d',
    fn: '#82aaff',
    num: '#f78c6c',
    com: '#5f7e97',
    plain: '#d6deeb',
  }
  ctx.font = `400 17px ui-monospace, "Cascadia Code", Consolas, monospace`
  lines.forEach((line, li) => {
    let x = 220
    const y = 78 + li * 30
    ctx.fillStyle = 'rgba(120,140,180,0.35)'
    ctx.fillText(String(li + 1).padStart(2, ' '), 200, y)
    line.forEach((token) => {
      if (!token) return
      let color = colors.plain
      if (['import', 'from', 'const', 'new', 'function', 'return'].includes(token.trim())) color = colors.kw
      else if (token.startsWith("'") || token.startsWith('"')) color = colors.str
      else if (token.startsWith('//')) color = colors.com
      else if (/^[0-9]/.test(token.trim())) color = colors.num
      else if (['welcome', 'animate', 'log', 'setAnimationLoop'].includes(token.trim())) color = colors.fn
      ctx.fillStyle = color
      ctx.fillText(token, x, y)
      x += ctx.measureText(token).width
    })
  })

  // 光标
  ctx.fillStyle = '#82aaff'
  ctx.fillRect(220 + 4, 78 + 6 * 30 + 4, 2, 20)

  return toTexture(canvas, { repeat: [1, 1], anisotropy })
}

/* ------------------------------------------------------------------ */
/* 笔记本 / 留言簿封面                                                  */
/* ------------------------------------------------------------------ */
export function makeBookTexture(anisotropy = 8) {
  const w = 512
  const h = 640
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')

  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#6b4b3e')
  g.addColorStop(1, '#4a3229')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = 'rgba(233, 205, 160, 0.5)'
  ctx.lineWidth = 4
  ctx.strokeRect(36, 36, w - 72, h - 72)

  ctx.fillStyle = 'rgba(243, 226, 196, 0.95)'
  ctx.font = `700 92px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText('留言', w / 2, 260)
  ctx.fillText('簿', w / 2, 370)

  ctx.strokeStyle = 'rgba(233, 205, 160, 0.4)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(w * 0.3, 420)
  ctx.lineTo(w * 0.7, 420)
  ctx.stroke()

  ctx.font = `400 26px ${FONT}`
  ctx.fillStyle = 'rgba(243, 226, 196, 0.6)'
  ctx.fillText('GUEST BOOK', w / 2, 470)

  return toTexture(canvas, { repeat: [1, 1], anisotropy })
}

/* ------------------------------------------------------------------ */
/* 城市剪影（窗外远景）                                                 */
/* ------------------------------------------------------------------ */
export function makeSkylineTexture(anisotropy = 8) {
  const w = 2048
  const h = 512
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')
  const rand = mulberry32(4242)

  ctx.clearRect(0, 0, w, h)

  // 远近两层楼群
  const layers = [
    { baseline: h, maxH: h * 0.5, alpha: 0.45, lerp: 0.6 },
    { baseline: h, maxH: h * 0.72, alpha: 0.9, lerp: 1 },
  ]
  layers.forEach((layer, li) => {
    let x = -30
    while (x < w + 30) {
      const bw = 40 + rand() * 110
      const bh = layer.maxH * (0.25 + rand() * 0.75)
      ctx.fillStyle = li === 0 ? `rgba(20,30,55,${layer.alpha})` : `rgba(8,12,26,${layer.alpha})`
      ctx.fillRect(x, layer.baseline - bh, bw, bh)
      // 屋顶小结构
      if (rand() > 0.7) {
        ctx.fillRect(x + bw * 0.3, layer.baseline - bh - 14, 6, 14)
      }
      // 亮着的窗户
      if (li === 1) {
        for (let wy = layer.baseline - bh + 14; wy < layer.baseline - 20; wy += 22) {
          for (let wx = x + 8; wx < x + bw - 10; wx += 16) {
            if (rand() > 0.68) {
              ctx.fillStyle = `rgba(255, 216, 150, ${0.25 + rand() * 0.6})`
              ctx.fillRect(wx, wy, 6, 9)
            }
          }
        }
      }
      x += bw + 8 + rand() * 26
    }
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.anisotropy = anisotropy
  return texture
}

/* ------------------------------------------------------------------ */
/* 简单径向渐变（粒子 sprite 用）                                       */
/* ------------------------------------------------------------------ */
export function makeGlowTexture() {
  const size = 128
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.65)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.15)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export const POSTER_COUNT = POSTER_THEMES.length
export const POSTER_TITLES = POSTER_THEMES.map((t) => t.title)
