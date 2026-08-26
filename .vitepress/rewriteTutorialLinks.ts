import type MarkdownIt from 'markdown-it'

function rewriteTutorialHref(href: string): string {
  const trimmed = href.trim()
  const foundations =
    /^(?:\.\.\/)*tutorial-generative-foundations\/([^?#]*?)([?#].*)?$/
  const match = trimmed.match(foundations)
  if (!match) return href

  const rawPath = match[1].replace(/\\/g, '/')
  const suffix = match[2] ?? ''
  const withoutMd = rawPath.replace(/\.md$/i, '')

  if (withoutMd === '' || withoutMd === 'README' || withoutMd === 'index') {
    return `/generative-foundations/${suffix}`
  }

  return `/generative-foundations/${withoutMd}${suffix}`
}

export function rewriteTutorialLinks(md: MarkdownIt) {
  md.core.ruler.after('inline', 'rewrite-tutorial-links', (state) => {
    for (const block of state.tokens) {
      if (block.type !== 'inline' || !block.children) continue
      for (const token of block.children) {
        if (token.type !== 'link_open') continue
        const href = token.attrGet('href')
        if (!href) continue
        const next = rewriteTutorialHref(href)
        if (next !== href) token.attrSet('href', next)
      }
    }
  })
}
