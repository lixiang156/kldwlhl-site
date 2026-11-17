const json = (data) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

export async function onRequestGet({ env }) {
  if (!env.BEDROOM_KV) return json({ checkins: 0, messages: 0 })
  const total = Number((await env.BEDROOM_KV.get('stats:checkins')) || '0')
  const list = await env.BEDROOM_KV.list({ prefix: 'msg:', limit: 1000 })
  return json({ checkins: total, messages: list.keys.length })
}
