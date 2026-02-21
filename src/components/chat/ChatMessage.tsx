import { cn } from '@/lib/utils'
import { User, Bot, Copy, Check, Download, X, ThumbsUp, ThumbsDown, RefreshCw, Pencil } from 'lucide-react'
import { useState } from 'react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ThinkingBlock } from './ThinkingBlock'
import { ToolCall } from './ToolCall'
import type { ChatMessage as ChatMessageType } from '@/lib/types'

interface Props {
  message: ChatMessageType
  isLast?: boolean
  onRegenerate?: () => void
  onReact?: (id: string, reaction: 'up' | 'down' | null) => void
  onEdit?: (id: string, newText: string) => void
}

export function ChatMessage({ message, isLast, onRegenerate, onReact, onEdit }: Props) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const isUser = message.role === 'user'

  function handleCopy() {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function startEdit() {
    setEditText(message.content)
    setEditing(true)
  }

  function submitEdit() {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== message.content) onEdit?.(message.id, trimmed)
    setEditing(false)
  }

  return (
    <div className={cn('group flex gap-3 px-4 py-4', isUser ? 'justify-end' : '')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={16} className="text-[var(--primary)]" />
        </div>
      )}

      <div className={cn('max-w-[75%] min-w-0', isUser && 'order-first')} {...(!isUser ? { 'data-assistant-msg': true } : {})}>
        {isUser ? (
          <div>
            {editing ? (
              <div className="space-y-2">
                <textarea value={editText} onChange={e => setEditText(e.target.value)}
                  className="w-full rounded-xl bg-[var(--card)] border border-[var(--border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40 resize-none"
                  rows={3} autoFocus onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit() } }} />
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => setEditing(false)} className="px-3 py-1 rounded-lg text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)]">Cancel</button>
                  <button onClick={submitEdit} className="px-3 py-1 rounded-lg text-xs bg-[var(--primary)] text-[var(--primary-foreground)]">Send</button>
                </div>
              </div>
            ) : (
              <div className="relative group/user">
                <div className="rounded-2xl rounded-br-sm bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2.5 text-sm">
                  {message.attachments?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {message.attachments.map((a: any, i: number) => (
                        <AttachmentChip key={i} attachment={a} />
                      ))}
                    </div>
                  )}
                  {message.content}
                </div>
                {onEdit && (
                  <button onClick={startEdit} title="Edit & resend"
                    className="absolute -left-8 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover/user:opacity-100 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-opacity">
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {message.blocks.filter(b => b.type === 'thinking').map((b, i) => (
              <ThinkingBlock key={i} text={b.text ?? ''} isStreaming={message.isStreaming} />
            ))}

            {message.blocks.filter(b => b.type === 'tool_use').map((b, i) => (
              <ToolCall key={i} block={b} />
            ))}

            {message.content && (
              <div className="text-sm text-[var(--foreground)]">
                <MarkdownRenderer content={message.content} />
              </div>
            )}

            {/* Reading indicator — waiting for stream to start */}
            {message.isStreaming && !message.content && message.blocks.length === 0 && (
              <div className="flex items-center gap-1 py-2">
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:300ms]" />
              </div>
            )}

            {/* Streaming cursor */}
            {message.isStreaming && message.content && (
              <span className="inline-block w-2 h-4 bg-[var(--primary)] animate-pulse rounded-sm" />
            )}

            {/* Actions bar */}
            {!message.isStreaming && message.content && (
              <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={handleCopy} className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)]" title="Copy">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                {onReact && (
                  <>
                    <button onClick={() => onReact(message.id, message.reaction === 'up' ? null : 'up')}
                      className={cn('p-1 rounded hover:bg-[var(--muted)]', message.reaction === 'up' ? 'text-green-500' : 'text-[var(--muted-foreground)]')} title="Good response">
                      <ThumbsUp size={14} />
                    </button>
                    <button onClick={() => onReact(message.id, message.reaction === 'down' ? null : 'down')}
                      className={cn('p-1 rounded hover:bg-[var(--muted)]', message.reaction === 'down' ? 'text-red-400' : 'text-[var(--muted-foreground)]')} title="Bad response">
                      <ThumbsDown size={14} />
                    </button>
                  </>
                )}
                {isLast && onRegenerate && (
                  <button onClick={onRegenerate} className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)]" title="Regenerate">
                    <RefreshCw size={14} />
                  </button>
                )}
                {message.generationTimeMs && (
                  <span className="text-[10px] text-[var(--muted-foreground)] ml-1">
                    {(message.generationTimeMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && !editing && (
        <div className="w-7 h-7 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0 mt-0.5">
          <User size={16} className="text-[var(--muted-foreground)]" />
        </div>
      )}
    </div>
  )
}

function AttachmentChip({ attachment: a }: { attachment: any }) {
  const [lightbox, setLightbox] = useState(false)
  const isImage = a.mimeType?.startsWith('image/')
  const dataUrl = `data:${a.mimeType};base64,${a.content}`

  return (
    <>
      {isImage ? (
        <button onClick={() => setLightbox(true)} className="block rounded overflow-hidden max-w-48">
          <img src={dataUrl} alt={a.fileName} className="max-h-32 rounded object-cover" />
        </button>
      ) : (
        <button onClick={() => { const l = document.createElement('a'); l.href = dataUrl; l.download = a.fileName; l.click() }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/20 text-[11px] hover:bg-black/30">
          <Download size={10} /> {a.fileName}
        </button>
      )}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setLightbox(false)}>
          <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 text-white"><X size={24} /></button>
          <img src={dataUrl} alt={a.fileName} className="max-w-[90vw] max-h-[90vh] rounded-lg" />
        </div>
      )}
    </>
  )
}
