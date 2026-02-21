import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import js from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript'
import ts from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript'
import py from 'react-syntax-highlighter/dist/esm/languages/hljs/python'
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash'
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json'
import css from 'react-syntax-highlighter/dist/esm/languages/hljs/css'
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql'
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml'
import md from 'react-syntax-highlighter/dist/esm/languages/hljs/markdown'
import yaml from 'react-syntax-highlighter/dist/esm/languages/hljs/yaml'
import docker from 'react-syntax-highlighter/dist/esm/languages/hljs/dockerfile'
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go'
import rust from 'react-syntax-highlighter/dist/esm/languages/hljs/rust'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'

SyntaxHighlighter.registerLanguage('javascript', js)
SyntaxHighlighter.registerLanguage('js', js)
SyntaxHighlighter.registerLanguage('jsx', js)
SyntaxHighlighter.registerLanguage('typescript', ts)
SyntaxHighlighter.registerLanguage('ts', ts)
SyntaxHighlighter.registerLanguage('tsx', ts)
SyntaxHighlighter.registerLanguage('python', py)
SyntaxHighlighter.registerLanguage('py', py)
SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('sh', bash)
SyntaxHighlighter.registerLanguage('shell', bash)
SyntaxHighlighter.registerLanguage('zsh', bash)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('css', css)
SyntaxHighlighter.registerLanguage('sql', sql)
SyntaxHighlighter.registerLanguage('html', xml)
SyntaxHighlighter.registerLanguage('xml', xml)
SyntaxHighlighter.registerLanguage('markdown', md)
SyntaxHighlighter.registerLanguage('md', md)
SyntaxHighlighter.registerLanguage('yaml', yaml)
SyntaxHighlighter.registerLanguage('yml', yaml)
SyntaxHighlighter.registerLanguage('dockerfile', docker)
SyntaxHighlighter.registerLanguage('docker', docker)
SyntaxHighlighter.registerLanguage('go', go)
SyntaxHighlighter.registerLanguage('rust', rust)
SyntaxHighlighter.registerLanguage('rs', rust)

export default function CodeHighlighter({ language, code }: { language: string; code: string }) {
  return (
    <SyntaxHighlighter
      language={language}
      style={atomOneDark}
      customStyle={{ margin: 0, padding: '12px 16px', background: 'transparent', fontSize: '12.5px', lineHeight: '1.6' }}
      wrapLongLines
    >
      {code}
    </SyntaxHighlighter>
  )
}
