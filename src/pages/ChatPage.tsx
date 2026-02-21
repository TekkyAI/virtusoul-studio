import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, PanelRightOpen, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { MessageList } from '@/components/chat/MessageList'
import { ChatInput } from '@/components/chat/ChatInput'
import { SelectionToolbar } from '@/components/chat/SelectionToolbar'
import { ChatRightPanel } from '@/components/chat/ChatRightPanel'
import { useVoice } from '@/hooks/useVoice'

export default function ChatPage() {
  const {
    messages, isGenerating, isLoadingHistory, queue,
    sessions, activeSession,
    sendMessage, abort, switchSession, newChat,
    regenerate, react, editAndResend,
  } = useChat()
  const [showFiles, setShowFiles] = useState(false)
  const [voiceAvailable, setVoiceAvailable] = useState(false)
  const { recording, speaking, autoSpeak, setAutoSpeak, startRecording, stopRecording, speak, stopSpeaking } = useVoice()
  const prevMsgCount = useRef(messages.length)
  const [searchParams] = useSearchParams()

  // Switch session from URL param
  useEffect(() => {
    const s = searchParams.get('s')
    if (s && s !== activeSession) switchSession(s)
  }, [searchParams])

  useEffect(() => {
    fetch('/api/voice/status').then(r => r.json()).then(d => setVoiceAvailable(d.available)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!autoSpeak || messages.length <= prevMsgCount.current) { prevMsgCount.current = messages.length; return }
    const last = messages[messages.length - 1]
    if (last?.role === 'assistant' && !last.isStreaming && last.content) speak(last.content)
    prevMsgCount.current = messages.length
  }, [messages, autoSpeak, speak])

  const handleMic = useCallback(async () => {
    if (recording) {
      const text = await stopRecording()
      if (text.trim()) sendMessage(text)
    } else {
      startRecording().catch(() => {})
    }
  }, [recording, startRecording, stopRecording, sendMessage])

  const handleSelectionAction = useCallback((action: string, text: string) => {
    if (action === 'bookmark') {
      fetch('/api/bookmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selectedText: text }) }).catch(() => {})
      return
    }
    if (action === 'memory') {
      fetch('/api/memory/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text, source: 'chat-selection' }) }).catch(() => {})
      return
    }
    const prompts: Record<string, string> = {
      explain: `Explain this:\n\n> ${text}`,
      simplify: `Simplify this in plain language:\n\n> ${text}`,
      deep_dive: `Give me a deep dive on this:\n\n> ${text}`,
      translate: `Translate this to English (or if already English, to the user's language):\n\n> ${text}`,
    }
    if (prompts[action]) sendMessage(prompts[action])
  }, [sendMessage])

  const exportMd = useCallback(() => {
    const md = messages.map(m => `### ${m.role === 'user' ? 'You' : 'Assistant'}\n\n${m.content}\n`).join('\n---\n\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `chat-${activeSession.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
  }, [messages, activeSession])

  const hasFiles = messages.some(m => m.attachments?.length)

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-w-0">
        {messages.length > 0 && (
          <div className="flex justify-end gap-1 px-4 py-1.5 border-b border-[var(--border)]">
            {voiceAvailable && (
              <button onClick={() => speaking ? stopSpeaking() : setAutoSpeak(a => !a)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${autoSpeak ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'} hover:bg-[var(--muted)]`}>
                {autoSpeak ? <Volume2 size={12} /> : <VolumeX size={12} />} {speaking ? 'Speaking…' : autoSpeak ? 'Auto-speak' : 'Speaker'}
              </button>
            )}
            {hasFiles && (
              <button onClick={() => setShowFiles(f => !f)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
                <PanelRightOpen size={12} /> Files
              </button>
            )}
            <button onClick={exportMd} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
              <Download size={12} /> Export
            </button>
          </div>
        )}
        {isLoadingHistory ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-[var(--muted-foreground)]">Loading history...</p>
          </div>
        ) : (
          <MessageList messages={messages} onRegenerate={regenerate} onReact={react} onEdit={editAndResend} />
        )}
        <div className="relative">
          <ChatInput onSend={sendMessage} onAbort={abort} isGenerating={isGenerating} queueCount={queue.length} />
          {voiceAvailable && (
            <button onClick={handleMic} title={recording ? 'Stop recording' : 'Voice input'}
              className={`absolute right-6 bottom-6 w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]/80'}`}>
              {recording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
        </div>
      </div>
      {showFiles && <ChatRightPanel messages={messages} onClose={() => setShowFiles(false)} />}
      <SelectionToolbar onAction={handleSelectionAction} />
    </div>
  )
}
