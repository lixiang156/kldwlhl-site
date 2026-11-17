/**
 * 留言板 API —— Cloudflare Pages Functions。
 *
 * 绑定：在 Pages 项目设置里添加 KV 命名空间，变量名 BEDROOM_KV。
 * 本地调试：wrangler pages dev dist
 *
 * GET  /api/messages  → { messages: [...] }
 * POST /api/messages  → { message: {...} }
 */

const MAX_MESSAGES = 120

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  })

function sanitize(str, max) {
  return String(str || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max)
}

export async function onRequestGet({ env }) {
  if (!env.BEDROOM_KV) return json({ messages: [], error: 'KV 未绑定' }, 500)
  const list = await env.BEDROOM_KV.list({ prefix: 'msg:', limit: MAX_MESSAGES })
  const rows = await Promise.all(list.keys.map((k) => env.BEDROOM_KV.get(k.name, 'json')))
  const messages = rows
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, MAX_MESSAGES)
  return json({ messages })
}

export async function onRequestPost({ request, env }) {
  if (!env.BEDROOM_KV) return json({ error: 'KV 未绑定' }, 500)
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }

  const text = sanitize(body.text, 240)
  if (!text) return json({ error: '留言不能为空' }, 400)

  const message = {
    id: crypto.randomUUID(),
    name: sanitize(body.name, 24) || '匿名旅人',
    text,
    mood: sanitize(body.mood, 4) || '✨',
    createdAt: new Date().toISOString(),
    ua: sanitize(request.headers.get('user-agent'), 80),
  }

  const key = 'msg:' + Date.now() + ':' + message.id
  await env.BEDROOM_KV.put(key, JSON.stringify(message))

  return json({ message }, 201)
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  })
}
