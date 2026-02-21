import { useState, useEffect, useCallback } from 'react'

interface Conversation {
  id: string
  title: string
  agentId: string | null
  sessionKey: string | null
  updatedAt: string
  createdAt: string
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    fetch('/api/conversations')
      .then(r => r.ok ? r.json() : { conversations: [] })
      .then(d => setConversations(d.conversations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const create = useCallback(async (opts?: { title?: string; agentId?: string; sessionKey?: string }) => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts ?? {}),
    })
    const data = await res.json()
    refresh()
    return data.conversation as Conversation
  }, [refresh])

  const update = useCallback(async (id: string, patch: { title?: string; pinned?: boolean }) => {
    await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    refresh()
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    refresh()
  }, [refresh])

  return { conversations, loading, refresh, create, update, remove }
}
