import { useState, useMemo } from 'react'
import { Code, Eye, Maximize2, X } from 'lucide-react'

export function ArtifactPreview({ language, code }: { language: string; code: string }) {
  const [showPreview, setShowPreview] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  const isHtml = /^html?$/i.test(language)
  const isSvg = /^svg$/i.test(language)
  const isMermaid = /^mermaid$/i.test(language)

  const srcDoc = useMemo(() => {
    if (isSvg) return `<!DOCTYPE html><html><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#0a0a0a">${code}</body></html>`
    if (isHtml) return code.includes('<html') ? code : `<!DOCTYPE html><html><head><style>body{margin:0;font-family:system-ui;background:#0a0a0a;color:#e5e5e5;padding:16px}</style></head><body>${code}</body></html>`
    if (isMermaid) return `<!DOCTYPE html><html><head><script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"><\/script></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#0a0a0a"><pre class="mermaid">${code.replace(/</g,'&lt;')}</pre><script>mermaid.initialize({startOnLoad:true,theme:'dark'})<\/script></body></html>`
    return ''
  }, [code, isHtml, isSvg, isMermaid])

  if (!isHtml && !isSvg && !isMermaid) return null

  return (
    <>
      <div className="flex items-center gap-1 mt-1 mb-1">
        <button onClick={() => setShowPreview(false)} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${!showPreview ? 'bg-[var(--muted)] text-[var(--foreground)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>
          <Code size={11} /> Code
        </button>
        <button onClick={() => setShowPreview(true)} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${showPreview ? 'bg-[var(--muted)] text-[var(--foreground)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>
          <Eye size={11} /> Preview
        </button>
        {showPreview && (
          <button onClick={() => setFullscreen(true)} className="ml-auto p-1 rounded text-[var(--muted-foreground)] hover:bg-[var(--muted)]" title="Fullscreen">
            <Maximize2 size={12} />
          </button>
        )}
      </div>
      {showPreview && (
        <iframe srcDoc={srcDoc} sandbox="allow-scripts" className="w-full h-64 rounded-lg border border-[var(--border)] bg-[#0a0a0a]" />
      )}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex justify-end p-2">
            <button onClick={() => setFullscreen(false)} className="p-2 rounded-lg text-white hover:bg-white/10"><X size={20} /></button>
          </div>
          <iframe srcDoc={srcDoc} sandbox="allow-scripts" className="flex-1 m-4 rounded-lg" />
        </div>
      )}
    </>
  )
}
