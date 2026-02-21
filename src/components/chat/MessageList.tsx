import { useEffect, useRef } from 'react'
import { ChatMessage } from './ChatMessage'
import type { ChatMessage as ChatMessageType } from '@/lib/types'

interface Props {
  messages: ChatMessageType[]
  onRegenerate?: () => void
  onReact?: (id: string, reaction: 'up' | 'down' | null) => void
  onEdit?: (id: string, newText: string) => void
}

export function MessageList({ messages, onRegenerate, onReact, onEdit }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <img src="/logo.svg" alt="VirtuSoul" className="w-16 h-16 mx-auto" />
          <p className="text-2xl font-bold tracking-tight">
            Virtu<span className="text-[var(--primary)]">Soul</span>
            <span className="text-[var(--muted-foreground)] font-normal text-lg ml-1.5">Studio</span>
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">Start a conversation with your OpenClaw agent</p>
        </div>
      </div>
    )
  }

  const lastAssistantIdx = messages.reduce((acc, m, i) => m.role === 'assistant' ? i : acc, -1)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-4">
        {messages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isLast={i === lastAssistantIdx}
            onRegenerate={onRegenerate}
            onReact={onReact}
            onEdit={msg.role === 'user' ? onEdit : undefined}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
