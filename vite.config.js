import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 把 three 自带的 Draco 解码器复制到 public/draco/。
 * 这样勾了 Draco 压缩的 GLB 才能在本地/线上正常加载（不依赖 CDN）。
 */
function prepareDraco() {
  const src = path.resolve('node_modules/three/examples/jsm/libs/draco/gltf')
  const dest = path.resolve('public/draco')
  try {
    if (!fs.existsSync(src)) return
    const files = fs.readdirSync(src)
    if (!files.length) return
    const ready = fs.existsSync(dest) && fs.readdirSync(dest).length >= files.length
    if (ready) return
    fs.mkdirSync(dest, { recursive: true })
    for (const file of files) {
      fs.copyFileSync(path.join(src, file), path.join(dest, file))
    }
    console.log('[draco] 已复制解码器到 public/draco')
  } catch (err) {
    console.warn('[draco] 复制失败（不影响未压缩模型）:', err.message)
  }
}

prepareDraco()

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 用相对路径，方便部署到任意子目录（如 yoursite.com/room/）
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1800,
  },
})
