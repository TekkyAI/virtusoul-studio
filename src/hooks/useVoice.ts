import { useState, useRef, useCallback } from 'react'

export function useVoice() {
  const [recording, setRecording] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const startRecording = useCallback(async (): Promise<void> => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    chunksRef.current = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.start()
    recorderRef.current = recorder
    setRecording(true)
  }, [])

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state === 'inactive') { resolve(''); return }
      recorder.onstop = async () => {
        recorder.stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const form = new FormData()
        form.append('audio', blob)
        try {
          const r = await fetch('/api/voice/stt', { method: 'POST', body: form })
          if (r.ok) { const d = await r.json(); resolve(d.text || '') }
          else resolve('')
        } catch { resolve('') }
        setRecording(false)
      }
      recorder.stop()
    })
  }, [])

  const speak = useCallback(async (text: string, voiceId = 'alloy') => {
    if (!text.trim()) return
    setSpeaking(true)
    try {
      const r = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceId }),
      })
      if (!r.ok) { setSpeaking(false); return }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url) }
      audio.play()
    } catch { setSpeaking(false) }
  }, [])

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause()
    setSpeaking(false)
  }, [])

  return { recording, speaking, autoSpeak, setAutoSpeak, startRecording, stopRecording, speak, stopSpeaking }
}
