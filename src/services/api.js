/**
 * 留言 / 打卡数据层。
 *
 * - 配置了 VITE_API_BASE（或部署在 Cloudflare Pages 上）时走后端；
 * - 本地开发时后端通常不存在，会自动降级到 localStorage，
 *   这样你第一次 npm run dev 就能完整玩一遍。
 *
 * 后端实现见 functions/api/*.js。
 */

const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')
const LS_MESSAGES = 'bedroom.messages.v1'
const LS_VISITOR = 'bedroom.visitor.v1'
const LS_CHECKINS = 'bedroom.checkins.v1'

let remoteAvailable = null

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function request(path, options = {}, timeout = 4500) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(API_BASE + path, {
      ...options,
      signal: controller.signal,
      headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    remoteAvailable = true
    return data
  } finally {
    clearTimeout(timer)
  }
}

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 隐身模式下可能失败，忽略 */
  }
}

function localList() {
  return readLS(LS_MESSAGES, [])
}

function localAdd(message) {
  const list = localList()
  list.unshift(message)
  writeLS(LS_MESSAGES, list.slice(0, 200))
  return message
}

export const api = {
  /** 读取留言板 */
  async listMessages() {
    if (remoteAvailable === false) {
      return { offline: true, messages: localList() }
    }
    try {
      const data = await request('/messages')
      return { offline: false, messages: data.messages || [] }
    } catch {
      remoteAvailable = false
      return { offline: true, messages: localList() }
    }
  },

  /** 写一条留言 */
  async addMessage({ name, text, mood }) {
    const payload = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: (name || '匿名旅人').slice(0, 24),
      text: (text || '').slice(0, 240),
      mood: mood || '✨',
      createdAt: new Date().toISOString(),
    }
    if (remoteAvailable === false) {
      return { offline: true, message: localAdd(payload) }
    }
    try {
      const data = await request('/messages', { method: 'POST', body: JSON.stringify(payload) })
      return { offline: false, message: data.message || payload }
    } catch {
      remoteAvailable = false
      return { offline: true, message: localAdd(payload) }
    }
  },

  /** 访客打卡（每个浏览器只打一次） */
  async checkIn(name) {
    const visitor = readLS(LS_VISITOR, null)
    if (visitor) return { offline: true, already: true, visitor }
    const payload = {
      name: (name || '匿名旅人').slice(0, 24),
      at: new Date().toISOString(),
    }
    let result = { offline: true, visitor: payload }
    if (remoteAvailable !== false) {
      try {
        const data = await request('/checkin', { method: 'POST', body: JSON.stringify(payload) })
        result = { offline: false, visitor: data.visitor || payload }
      } catch {
        remoteAvailable = false
      }
    }
    writeLS(LS_VISITOR, result.visitor)
    const list = readLS(LS_CHECKINS, [])
    list.unshift(result.visitor)
    writeLS(LS_CHECKINS, list.slice(0, 50))
    return { ...result, already: false }
  },

  /** 最近访客数 */
  async visitorCount() {
    const local = readLS(LS_CHECKINS, []).length
    if (remoteAvailable === false) return { offline: true, count: local }
    try {
      const data = await request('/stats')
      return { offline: false, count: data.checkins ?? local }
    } catch {
      remoteAvailable = false
      return { offline: true, count: local }
    }
  },

  resetLocal() {
    localStorage.removeItem(LS_MESSAGES)
    localStorage.removeItem(LS_VISITOR)
    localStorage.removeItem(LS_CHECKINS)
  },
}
