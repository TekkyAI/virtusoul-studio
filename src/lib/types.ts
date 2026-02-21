export interface MessageBlock {
  type: 'text' | 'thinking' | 'tool_use' | 'tool_result'
  text?: string
  name?: string
  input?: Record<string, unknown>
  toolCallId?: string
  result?: unknown
  status?: 'running' | 'done' | 'error'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  blocks: MessageBlock[]
  isStreaming?: boolean
  runId?: string
  timestamp: number
  generationTimeMs?: number
  attachments?: any[]
  reaction?: 'up' | 'down' | null
}
