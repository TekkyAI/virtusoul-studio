import { useState, useEffect } from 'react'

interface GatewayStatusData {
  status: string
  connected: boolean
  uptimeMs: number
  gatewayUrl: string
}

export function useGatewayStatus(intervalMs = 10000) {
  const [data, setData] = useState<GatewayStatusData | null>(null)

  useEffect(() => {
    const poll = () =>
      fetch('/api/gateway/status')
        .then(r => r.json())
        .then(setData)
        .catch(() => setData(null))

    poll()
    const id = setInterval(poll, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return data
}
