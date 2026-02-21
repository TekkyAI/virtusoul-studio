import { lazy, Suspense, memo } from 'react'
import type { Components } from 'react-markdown'
import { CodeBlock } from './CodeBlock'

const Markdown = lazy(() => import('react-markdown').then(m => ({ default: m.default })))

const components: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const text = String(children).replace(/\n$/, '')
    // Inline code (no language class, single line, short)
    if (!match && !text.includes('\n') && text.length < 200) {
      return <code className="px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--primary)] text-[12.5px] font-mono" {...props}>{children}</code>
    }
    return <CodeBlock language={match?.[1]}>{text}</CodeBlock>
  },
  pre({ children }) {
    // CodeBlock already wraps in its own container, just pass through
    return <>{children}</>
  },
  table({ children }) {
    return (
      <div className="my-3 overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-xs">{children}</table>
      </div>
    )
  },
  thead({ children }) {
    return <thead className="bg-[var(--muted)] text-[var(--muted-foreground)] text-left">{children}</thead>
  },
  th({ children }) {
    return <th className="px-3 py-2 font-medium border-b border-[var(--border)]">{children}</th>
  },
  td({ children }) {
    return <td className="px-3 py-2 border-b border-[var(--border)]">{children}</td>
  },
  a({ href, children }) {
    // Detect workspace file links and make them downloadable
    if (href) {
      const cleaned = href.replace(/^sandbox:/, '')
      const wsMatch = cleaned.match(/\.openclaw\/workspace\/(.+)$/) || cleaned.match(/^(?!https?:\/\/)([^/].*\.\w+)$/)
      if (wsMatch) {
        const filePath = wsMatch[1] || wsMatch[0]
        const downloadUrl = `/api/admin/workspace/file?path=${encodeURIComponent(filePath)}&download=1`
        return (
          <a href={downloadUrl} download className="inline-flex items-center gap-1 text-[var(--primary)] underline underline-offset-2 hover:brightness-125">
            📎 {children}
          </a>
        )
      }
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] underline underline-offset-2 hover:brightness-125">{children}</a>
  },
  blockquote({ children }) {
    return <blockquote className="border-l-2 border-[var(--primary)]/40 pl-3 my-2 text-[var(--muted-foreground)] italic">{children}</blockquote>
  },
  ul({ children }) {
    return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
  },
  ol({ children }) {
    return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>
  },
  h1({ children }) { return <h1 className="text-lg font-semibold mt-4 mb-2">{children}</h1> },
  h2({ children }) { return <h2 className="text-base font-semibold mt-3 mb-1.5">{children}</h2> },
  h3({ children }) { return <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3> },
  hr() { return <hr className="my-3 border-[var(--border)]" /> },
  p({ children }) { return <p className="leading-relaxed my-1.5">{children}</p> },
  img({ src, alt }) {
    return <img src={src} alt={alt || ''} className="max-w-full rounded-lg my-2 max-h-80" loading="lazy" />
  },
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null
  return (
    <Suspense fallback={<span className="text-sm whitespace-pre-wrap">{content}</span>}>
      <div className="text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        <Markdown components={components}>{content}</Markdown>
      </div>
    </Suspense>
  )
})
