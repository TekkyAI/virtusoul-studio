import { Hono } from 'hono'

const voice = new Hono()

const getKey = () => process.env.OPENAI_API_KEY || ''

// POST /api/voice/stt — audio blob → text (Whisper)
voice.post('/stt', async (c) => {
  const key = getKey()
  if (!key) return c.json({ error: 'OPENAI_API_KEY not set' }, 500)

  const body = await c.req.formData()
  const file = body.get('audio') as File
  if (!file) return c.json({ error: 'No audio file' }, 400)

  const form = new FormData()
  form.append('file', file, 'audio.webm')
  form.append('model', 'whisper-1')
  form.append('response_format', 'json')
  const lang = body.get('language')
  if (lang) form.append('language', lang as string)

  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  })
  if (!r.ok) return c.json({ error: `Whisper error: ${r.status}` }, r.status as any)
  return c.json(await r.json())
})

// POST /api/voice/tts — { text, voice? } → audio stream
voice.post('/tts', async (c) => {
  const key = getKey()
  if (!key) return c.json({ error: 'OPENAI_API_KEY not set' }, 500)

  const { text, voice: v } = await c.req.json<{ text: string; voice?: string }>()
  if (!text) return c.json({ error: 'No text' }, 400)

  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', input: text.slice(0, 4096), voice: v || 'alloy' }),
  })
  if (!r.ok) return c.json({ error: `TTS error: ${r.status}` }, r.status as any)

  return new Response(r.body, { headers: { 'Content-Type': 'audio/mpeg' } })
})

// GET /api/voice/status — check if voice is available
voice.get('/status', (c) => {
  return c.json({ available: !!getKey() })
})

export default voice
