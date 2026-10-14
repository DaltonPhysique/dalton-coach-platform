// ════════════════════════════════════════════════════════════
// AI FOOD COACH — Netlify serverless function (server-side ONLY)
//
// WHAT THIS IS:
//   The brain behind the in-app food coach ("me in your pocket
//   24/7"). The client app POSTs the client's message plus their
//   nutrition context (today's targets, what's logged, what's
//   remaining). This function verifies they're a real logged-in
//   client, calls Anthropic, saves both messages to ai_chat_logs,
//   and returns the reply.
//
// SETUP FOR DALTON (do these once):
//   1. Go to console.anthropic.com → sign up / log in →
//      Settings → API keys → "Create Key". Add a card and set a
//      small spend limit ($5–10/month is plenty — each message
//      costs a fraction of a cent).
//   2. In Netlify: your coach-app site → Site settings →
//      Environment variables → add ANTHROPIC_API_KEY as a PLAIN
//      variable (NOT a VITE_ variable — VITE_ vars get baked
//      into the app code, which would expose the key).
//   3. Deploys → Trigger deploy (env vars need a fresh build).
//
// SPEND PROTECTION: max 30 messages per client per day. The
// function counts today's rows in ai_chat_logs and returns 429
// when the limit is hit.
//
// NEVER put ANTHROPIC_API_KEY in the client bundle, in a VITE_
// variable, in git, or in chat. Server-side only.
// ════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'

const ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 500
const DAILY_LIMIT = 30

const SYSTEM_PROMPT = `You are the client's personal food coach inside The Rebuild coaching app — a straight-talking coach who keeps it real and simple. Never mention being an AI. Talk like a coach texting a client: direct, no fluff, encouraging but honest. Not tryin too hard.

You always know the client's day, because it's handed to you with every message:
- Today's calorie and macro targets, what they've logged so far, and what's REMAINING. Work INSIDE the remaining macros — that's the whole game.
- Their day type (training day, leg day, or rest day) and their goal/phase.

Rules:
1. When they list foods they have available, build a concrete meal: exactly what to eat, portions in grams or ounces, and the macro math (calories, protein, carbs, fat).
2. If something they want doesn't fit their remaining macros, say so straight and offer the closest thing that does fit.
3. Never prescribe medical diets, diagnose conditions, or comment on eating disorders. If a question is medical, tell them to ask their coach or a doctor.
4. Keep replies short enough to read on a phone — 3 to 6 sentences, or a short list. No essays.
5. If the coach left a note for this client, treat it as the boss's word — defer to it over your own instincts.`

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'method_not_allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return json(503, {
      error: 'not_configured',
      message: "The food coach isn't connected yet — your coach is setting it up.",
    })
  }

  // ── verify the caller is a real logged-in client ──
  const authHeader = event.headers.authorization || event.headers.Authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return json(401, { error: 'unauthorized' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnon) {
    return json(500, { error: 'server_misconfigured' })
  }

  const authed = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  let user
  try {
    const { data, error } = await authed.auth.getUser(token)
    if (error || !data?.user) return json(401, { error: 'unauthorized' })
    user = data.user
  } catch {
    return json(401, { error: 'unauthorized' })
  }

  // ── spend protection: 30 user messages per client per day ──
  const dayStart = new Date()
  dayStart.setUTCHours(0, 0, 0, 0)
  try {
    const { count } = await authed
      .from('ai_chat_logs')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', user.id)
      .eq('role', 'user')
      .gte('created_at', dayStart.toISOString())
    if ((count || 0) >= DAILY_LIMIT) {
      return json(429, {
        error: 'rate_limited',
        message: "You've hit today's chat limit — the coach resets at midnight. Your remaining macros are still up to date above.",
      })
    }
  } catch {
    return json(500, { error: 'db_error' })
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { error: 'bad_request' })
  }
  const message = (body.message || '').trim()
  const ctx = body.context || {}
  if (!message) return json(400, { error: 'empty_message' })

  // ── recent history for continuity (last 10) ──
  let history = []
  try {
    const { data } = await authed
      .from('ai_chat_logs')
      .select('role, message')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    history = (data || []).reverse().map(m => ({ role: m.role, content: m.message }))
  } catch { /* history is nice-to-have */ }

  // ── build the user turn with nutrition context ──
  const t = ctx.targets || {}
  const c = ctx.consumed || {}
  const r = ctx.remaining || {}
  const contextBlock = [
    `[Client context — ${ctx.clientName || 'client'}${ctx.phase ? `, phase: ${ctx.phase}` : ''}${ctx.dayType ? `, today is a ${ctx.dayType} day` : ''}]`,
    `Targets today: ${t.calories ?? '—'} cal · ${t.protein_g ?? '—'}g protein · ${t.carbs_g ?? '—'}g carbs · ${t.fat_g ?? '—'}g fat`,
    `Logged so far: ${c.calories ?? 0} cal · ${c.protein_g ?? 0}g protein · ${c.carbs_g ?? 0}g carbs · ${c.fat_g ?? 0}g fat`,
    `REMAINING: ${r.calories ?? '—'} cal · ${r.protein_g ?? '—'}g protein · ${r.carbs_g ?? '—'}g carbs · ${r.fat_g ?? '—'}g fat`,
    ctx.coachNote ? `Coach's note for this client: "${ctx.coachNote}"` : null,
  ].filter(Boolean).join('\n')

  const messages = [
    ...history,
    { role: 'user', content: `${contextBlock}\n\nClient's message: ${message}` },
  ]

  // ── call Anthropic ──
  let reply
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages,
      }),
    })
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      console.error('Anthropic error:', resp.status, errText.slice(0, 300))
      return json(502, {
        error: 'ai_unavailable',
        message: "The food coach is having a moment — try again in a bit.",
      })
    }
    const data = await resp.json()
    reply = (data.content || []).map(b => b.text || '').join('').trim()
    if (!reply) throw new Error('empty reply')
  } catch (e) {
    console.error('Anthropic call failed:', e.message)
    return json(502, {
      error: 'ai_unavailable',
      message: "The food coach is having a moment — try again in a bit.",
    })
  }

  // ── save both sides of the exchange ──
  try {
    await authed.from('ai_chat_logs').insert([
      { client_id: user.id, role: 'user', message },
      { client_id: user.id, role: 'assistant', message: reply },
    ])
  } catch (e) {
    console.error('Chat log save failed:', e.message)
    // reply still goes back — logging is secondary
  }

  return json(200, { reply })
}
