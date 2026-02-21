import { useState, useEffect, useRef, useCallback } from 'react'
import { ChatClient } from '@/lib/chat-client'
import type { ChatMessage, MessageBlock } from '@/lib/types'

let globalClient: ChatClient | null = null
function getClient() {
  if (!globalClient) { globalClient = new ChatClient(); globalClient.connect() }
  return globalClient
}

export interface GatewaySession {
  key: string
  label: string
  messageCount?: number
  totalTokens?: number
  agentId?: string
  updatedAt?: number
  lastMessagePreview?: string
}

// Module-level cache so chat survives navigation
let cachedMessages: ChatMessage[] = []
let cachedSessions: GatewaySession[] = []

export function useChat() {
  const [messages, _setMessages] = useState<ChatMessage[]>(cachedMessages)
  const [isGenerating, setIsGenerating] = useState(false)
  const [sessions, _setSessions] = useState<GatewaySession[]>(cachedSessions)
  const [activeSession, setActiveSession] = useState<string>(() =>
    localStorage.getItem('vs_active_session') || 'agent:main:main'
  )
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const activeSessionRef = useRef(activeSession)
  const streamStartRef = useRef<number | null>(null)
  const isGeneratingRef = useRef(false)
  const [queue, setQueue] = useState<{ text: string; attachments?: any[] }[]>([])
  const historyLoadedRef = useRef(cachedMessages.length > 0)
  const conversationCreatedRef = useRef<Set<string>>(new Set())

  const setMessages: typeof _setMessages = (action) => {
    _setMessages(prev => {
      const next = typeof action === 'function' ? action(prev) : action
      cachedMessages = next
      return next
    })
  }
  const setSessions: typeof _setSessions = (action) => {
    _setSessions(prev => {
      const next = typeof action === 'function' ? action(prev) : action
      cachedSessions = next
      return next
    })
  }

  useEffect(() => {
    activeSessionRef.current = activeSession
    localStorage.setItem('vs_active_session', activeSession)
  }, [activeSession])

  // Load sessions on mount + restore history
  useEffect(() => {
    const client = getClient()
    const loadSessions = () => {
      client.send({ type: 'sessions' })
      // Load history for active session on mount
      if (!historyLoadedRef.current) {
        historyLoadedRef.current = true
        setIsLoadingHistory(true)
        client.send({ type: 'history', sessionKey: activeSessionRef.current, limit: 100 })
      }
    }
    const checkInterval = setInterval(() => {
      if (client.connected) { loadSessions(); clearInterval(checkInterval) }
    }, 500)
    return () => clearInterval(checkInterval)
  }, [])

  // Event handler
  useEffect(() => {
    const client = getClient()

    const unsub = client.onMessage((msg) => {
      if (msg.type === 'sessions') {
        const list = (msg.payload?.sessions as any[]) || []
        setSessions(list.map((s: any) => ({
          key: s.key || s.sessionKey,
          label: s.label || s.key || s.sessionKey,
          messageCount: s.messageCount,
          totalTokens: s.totalTokens,
          agentId: s.agentId,
          updatedAt: s.updatedAt,
          lastMessagePreview: s.lastMessagePreview,
        })))
        return
      }

      if (msg.type === 'history') {
        const rawMsgs = (msg.payload?.messages as any[]) || []
        const parsed = rawMsgs.map((m: any, i: number) => parseHistoryMessage(m, i))
          .filter(m => m.content || m.blocks.some(b => b.type === 'thinking' || b.type === 'tool_use'))
        setMessages(parsed)
        setIsLoadingHistory(false)
        // Mark this session as already having a conversation
        if (parsed.length > 0) conversationCreatedRef.current.add(activeSessionRef.current)
        return
      }

      if (msg.type === 'send-ack') {
        if (msg.payload?.sessionKey) {
          const sk = msg.payload.sessionKey as string
          setActiveSession(sk)
          activeSessionRef.current = sk
        }
        return
      }

      if (msg.type === 'error') {
        console.error('[chat] Error:', msg.error)
        setIsGenerating(false)
        return
      }

      if (msg.type === 'agent') {
        const p = msg.payload as any
        if (p.sessionKey && p.sessionKey !== activeSessionRef.current) return
        handleAgentEvent(p)
        return
      }

      if (msg.type === 'chat') {
        const p = msg.payload as any
        if (p.sessionKey && p.sessionKey !== activeSessionRef.current) return
        if (p.state === 'final' || p.state === 'error' || p.state === 'aborted') {
          finishStream(p.runId, p.state === 'error')
          // Refresh sessions after completion
          client.send({ type: 'sessions' })
        }
      }
    })

    return unsub
  }, [])

  function handleAgentEvent(p: any) {
    const { runId, stream, data } = p
    if (!runId) return

    if (stream === 'lifecycle') {
      if (data?.phase === 'start') {
        setIsGenerating(true)
        streamStartRef.current = Date.now()
        setMessages(prev => [...prev, {
          id: `stream-${runId}`, role: 'assistant' as const, content: '', blocks: [],
          isStreaming: true, runId, timestamp: Date.now(),
        }])
      } else if (data?.phase === 'end' || data?.phase === 'error') {
        finishStream(runId, data?.phase === 'error')
      }
      return
    }

    if (stream === 'assistant') {
      if (data?.text != null) {
        setMessages(prev => prev.map(m =>
          m.runId === runId && m.isStreaming ? { ...m, content: data.text as string } : m
        ))
      }
      if (data?.reasoning) {
        setMessages(prev => prev.map(m => {
          if (m.runId !== runId || !m.isStreaming) return m
          const blocks = [...m.blocks]
          const last = blocks[blocks.length - 1]
          if (last?.type === 'thinking') {
            blocks[blocks.length - 1] = { ...last, text: (last.text ?? '') + data.reasoning }
          } else {
            blocks.push({ type: 'thinking', text: data.reasoning })
          }
          return { ...m, blocks }
        }))
      }
      return
    }

    if (stream === 'tool') {
      if (!data?.toolCallId) return
      const { phase, toolCallId, name, toolName, args, params, result, error } = data
      setMessages(prev => prev.map(m => {
        if (m.runId !== runId || !m.isStreaming) return m
        const blocks = [...m.blocks]
        if (phase === 'start') {
          blocks.push({ type: 'tool_use', name: toolName || name || 'tool', input: args || params, toolCallId, status: 'running' })
        } else if (phase === 'end' || phase === 'result') {
          const b = blocks.find(b => b.toolCallId === toolCallId)
          if (b) { b.status = 'done'; b.result = typeof result === 'string' ? result : JSON.stringify(result) }
        } else if (phase === 'error') {
          const b = blocks.find(b => b.toolCallId === toolCallId)
          if (b) { b.status = 'error'; b.result = error }
        }
        return { ...m, blocks }
      }))
    }
  }

  function finishStream(runId: string, isError: boolean) {
    const genTime = streamStartRef.current ? Date.now() - streamStartRef.current : undefined
    streamStartRef.current = null
    setIsGenerating(false)
    isGeneratingRef.current = false
    setMessages(prev => prev.map(m =>
      m.runId === runId ? { ...m, isStreaming: false, generationTimeMs: genTime } : m
    ))
    // Flush queue
    setQueue(q => {
      if (q.length > 0) {
        const [next, ...rest] = q
        setTimeout(() => doSend(next.text, next.attachments), 100)
        return rest
      }
      return q
    })
  }

  const loadHistory = useCallback((sessionKey: string) => {
    setIsLoadingHistory(true)
    getClient().send({ type: 'history', sessionKey, limit: 100 })
  }, [])

  const switchSession = useCallback((key: string) => {
    setActiveSession(key)
    activeSessionRef.current = key
    setMessages([])
    setIsGenerating(false)
    loadHistory(key)
  }, [loadHistory])

  const newChat = useCallback(() => {
    // Generate a new session key
    const id = Math.random().toString(36).slice(2, 10)
    const key = `agent:main:${id}`
    setActiveSession(key)
    activeSessionRef.current = key
    setMessages([])
    setIsGenerating(false)
  }, [])

  const sendMessage = useCallback((text: string, attachments?: any[]) => {
    if (isGeneratingRef.current) {
      // Queue message while AI is busy
      setQueue(q => [...q, { text, attachments }])
      return
    }
    doSend(text, attachments)
  }, [])

  const doSend = useCallback((text: string, attachments?: any[]) => {
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`, role: 'user' as const, content: text,
      blocks: [], timestamp: Date.now(), attachments,
    }])
    setIsGenerating(true)
    isGeneratingRef.current = true
    const sk = activeSessionRef.current
    getClient().send({ type: 'send', message: text, sessionKey: sk, attachments })

    // Auto-title: create conversation record once per session
    if (!conversationCreatedRef.current.has(sk)) {
      conversationCreatedRef.current.add(sk)
      const title = text.length > 50 ? text.slice(0, 50) + '…' : text
      fetch('/api/conversations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sessionKey: sk }),
      }).then(() => window.dispatchEvent(new Event('conversations-changed'))).catch(() => {})
    }
  }, [])

  const abort = useCallback(() => {
    getClient().send({ type: 'abort', sessionKey: activeSessionRef.current })
  }, [])

  const regenerate = useCallback(() => {
    // Resend the last user message
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (lastUser) {
      // Remove the last assistant message
      setMessages(prev => {
        const idx = prev.length - 1
        return idx >= 0 && prev[idx].role === 'assistant' ? prev.slice(0, idx) : prev
      })
      doSend(lastUser.content, lastUser.attachments)
    }
  }, [messages, doSend])

  const react = useCallback((id: string, reaction: 'up' | 'down' | null) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, reaction } : m))
  }, [])

  const editAndResend = useCallback((id: string, newText: string) => {
    // Remove everything from this message onward, then send new text
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === id)
      return idx >= 0 ? prev.slice(0, idx) : prev
    })
    doSend(newText)
  }, [doSend])

  const refreshSessions = useCallback(() => {
    getClient().send({ type: 'sessions' })
  }, [])

  return {
    messages, isGenerating, isLoadingHistory,
    sessions, activeSession, queue,
    sendMessage, abort, switchSession, newChat, loadHistory, refreshSessions,
    regenerate, react, editAndResend,
  }
}

function cleanContent(text: string, role: string): string {
  if (!text) return text
  let cleaned = text
  if (role === 'user') {
    // Strip "Conversation info (untrusted metadata):\n```json\n{...}\n```\n\n[timestamp] " prefix
    cleaned = cleaned.replace(/^Conversation info \(untrusted metadata\):\s*```json\s*\{[\s\S]*?\}\s*```\s*/m, '')
    cleaned = cleaned.replace(/^\[.*?\]\s*/m, '')
  }
  if (role === 'assistant') {
    // Strip [[reply_to_current]] and similar tags
    cleaned = cleaned.replace(/^\[\[[\w_]+\]\]\s*/gm, '')
  }
  return cleaned.trim()
}

function parseHistoryMessage(m: any, i: number): ChatMessage {
  const blocks: MessageBlock[] = []
  const content = m.content
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === 'text') blocks.push({ type: 'text', text: cleanContent(block.text, m.role) })
      else if (block.type === 'thinking') blocks.push({ type: 'thinking', text: block.thinking || block.text || '' })
      else if (block.type === 'tool_use') blocks.push({ type: 'tool_use', name: block.name, input: block.input, toolCallId: block.id, status: 'done' })
      else if (block.type === 'tool_result') blocks.push({ type: 'tool_result', name: block.name, result: typeof block.content === 'string' ? block.content : JSON.stringify(block.content), toolCallId: block.tool_use_id, status: 'done' })
    }
  } else if (typeof content === 'string') {
    blocks.push({ type: 'text', text: cleanContent(content, m.role) })
  }

  const textContent = blocks.filter(b => b.type === 'text').map(b => b.text ?? '').join('\n').trim()
  return {
    id: m.id || `hist-${i}`,
    role: m.role === 'user' ? 'user' : 'assistant',
    content: textContent,
    blocks,
    timestamp: m.timestamp || Date.now(),
  }
}
