import { useState, lazy, Suspense } from 'react'
import { Copy, Check } from 'lucide-react'
import { ArtifactPreview } from './ArtifactPreview'

const Highlighter = lazy(() => import('./CodeHighlighter'))

export function CodeBlock({ language, children }: { language?: string; children: string }) {
  const [copied, setCopied] = useState(false)
  const lang = language || 'text'
  const code = children.replace(/\n$/, '')
  const isArtifact = /^(html?|svg|mermaid)$/i.test(lang)

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-[var(--border)] bg-[#1e1e2e]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#181825] text-[11px]">
        <span className="text-[var(--muted-foreground)] font-mono">{lang}</span>
        <button onClick={copy} className="flex items-center gap-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
          {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      {isArtifact ? (
        <div className="px-3 pb-3">
          <ArtifactPreview language={lang} code={code} />
        </div>
      ) : (
        <Suspense fallback={<pre className="p-3 text-xs font-mono overflow-x-auto">{code}</pre>}>
          <Highlighter language={lang} code={code} />
        </Suspense>
      )}
    </div>
  )
}
