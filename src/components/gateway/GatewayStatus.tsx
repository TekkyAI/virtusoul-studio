import { useGatewayStatus } from '@/hooks/useGatewayStatus'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500 animate-pulse',
  disconnected: 'bg-red-500',
}

export function GatewayStatus() {
  const data = useGatewayStatus()
  const status = data?.status ?? 'disconnected'

  return (
    <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]" title={`Gateway: ${status}`}>
      <span className={cn('w-2 h-2 rounded-full', statusColors[status] ?? statusColors.disconnected)} />
      Gateway
    </div>
  )
}
