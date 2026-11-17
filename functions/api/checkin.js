/**
 * 访客打卡 API。
 * GET  /api/checkin → 最近打卡
 * POST /api/checkin → 记录一次打卡
 */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  })

const sanitize = (str, max) =>
  String(str || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max)

export async function onRequestPost({ request, env }) {
  if (!env.BEDROOM_KV) return json({ error: 'KV 未绑定' }, 500)
  let body = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const visitor = {
    id: crypto.randomUUID(),
    name: sanitize(body.name, 24) || '匿名旅人',
    at: new Date().toISOString(),
  }

  await env.BEDROOM_KV.put('checkin:' + Date.now() + ':' + visitor.id, JSON.stringify(visitor))

  // 累计计数（KV 不是强一致，允许少量误差）
  const total = Number((await env.BEDROOM_KV.get('stats:checkins')) || '0') + 1
  await env.BEDROOM_KV.put('stats:checkins', String(total))

  return json({ visitor, total }, 201)
}

export async function onRequestGet({ env }) {
  if (!env.BEDROOM_KV) return json({ checkins: [], total: 0 }, 500)
  const list = await env.BEDROOM_KV.list({ prefix: 'checkin:', limit: 50 })
  const rows = await Promise.all(list.keys.map((k) => env.BEDROOM_KV.get(k.name, 'json')))
  const total = Number((await env.BEDROOM_KV.get('stats:checkins')) || '0')
  return json({ checkins: rows.filter(Boolean), total })
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
