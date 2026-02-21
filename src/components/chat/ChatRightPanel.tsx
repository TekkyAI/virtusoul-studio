import { Download, X, FileText, Image } from 'lucide-react'
import type { ChatMessage } from '@/lib/types'

export function ChatRightPanel({ messages, onClose }: { messages: ChatMessage[]; onClose: () => void }) {
  // Collect all attachments from messages
  const files = messages.flatMap(m =>
    (m.attachments ?? []).map((a: any) => ({ ...a, role: m.role, msgId: m.id }))
  )

  const download = (a: any) => {
    const link = document.createElement('a')
    link.href = `data:${a.mimeType};base64,${a.content}`
    link.download = a.fileName
    link.click()
  }

  return (
    <div className="w-64 border-l border-[var(--border)] bg-[var(--background)] flex flex-col shrink-0">
      <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-xs font-medium">Files</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-[var(--muted)]"><X size={14} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.length === 0 ? (
          <p className="text-[11px] text-[var(--muted-foreground)] text-center py-8">No files in this chat</p>
        ) : files.map((f, i) => {
          const isImage = f.mimeType?.startsWith('image/')
          return (
            <button key={i} onClick={() => download(f)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[var(--muted)] text-left">
              {isImage ? (
                <img src={`data:${f.mimeType};base64,${f.content}`} className="w-8 h-8 rounded object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded bg-[var(--muted)] flex items-center justify-center shrink-0">
                  <FileText size={14} className="text-[var(--muted-foreground)]" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] truncate">{f.fileName}</p>
                <p className="text-[9px] text-[var(--muted-foreground)]">{f.role === 'user' ? 'You' : 'Agent'}</p>
              </div>
              <Download size={10} className="shrink-0 text-[var(--muted-foreground)] ml-auto" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
