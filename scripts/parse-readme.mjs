import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const README_PATH = join(ROOT, 'README.md')

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parse() {
  const content = readFileSync(README_PATH, 'utf-8')
  const lines = content.split('\n')

  const startIdx = lines.findIndex(l => l.trim() === '<!-- resources-start -->')
  const endIdx = lines.findIndex(l => l.trim() === '<!-- resources-end -->')
  const hasDelimiters = startIdx !== -1 && endIdx !== -1

  const processLines = hasDelimiters ? lines.slice(startIdx + 1, endIdx) : lines

  const stack = []
  const sections = []
  let currentLinks = []

  function flushLinks() {
    if (currentLinks.length === 0) return
    const target = stack.length > 0 ? stack[stack.length - 1] : null
    if (target) {
      target.links.push(...currentLinks)
    } else if (sections.length > 0) {
      sections[sections.length - 1].links.push(...currentLinks)
    }
    currentLinks = []
  }

  for (const raw of processLines) {
    const line = raw.trimEnd()

    if (/^\s*\[↑\]/.test(line)) continue

    const headingMatch = line.match(/^(#{2,5})\s+(.+)$/)
    if (headingMatch) {
      flushLinks()

      const level = headingMatch[1].length
      const name = headingMatch[2].replace(/\s*\*{1,2}$/, '').trim()
      const id = slugify(name)

      const section = { id, name, level, links: [], children: [] }

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop()
      }

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(section)
      } else {
        sections.push(section)
      }

      stack.push(section)
      continue
    }

    const angleLinkMatch = line.match(/^\s*-\s+<([^>]+)>(?:\s+(.+))?/)
    if (angleLinkMatch) {
      let url = angleLinkMatch[1].trim()
      let rest = angleLinkMatch[2]?.trim() || ''

      const parenMatch = rest.match(/^\((.+)\)$/)
      if (parenMatch) {
        rest = parenMatch[1].trim()
      }

      if (url.startsWith('#')) continue

      currentLinks.push({ name: url, url, ...(rest ? { description: rest } : {}) })
      continue
    }

    const bracketLinkMatch = line.match(/^\s*-\s+\[([^\]]+)\]\(([^)]+)\)(?:\s*[—–-]\s*(.+))?/)
    if (bracketLinkMatch) {
      const name = bracketLinkMatch[1].trim()
      const url = bracketLinkMatch[2].trim()
      const description = bracketLinkMatch[3]?.trim() || ''

      if (url.startsWith('#')) continue

      currentLinks.push({ name, url, ...(description ? { description } : {}) })
      continue
    }
  }

  flushLinks()
  return sections
}

export function countLinks(sections) {
  let count = 0
  for (const s of sections) {
    count += s.links.length
    count += countLinks(s.children)
  }
  return count
}
