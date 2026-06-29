import { parse } from './parse-readme.mjs'

function flattenWithPath(sections, parentPath = '') {
  const items = []
  for (const s of sections) {
    const path = parentPath ? `${parentPath} › ${s.name}` : s.name
    for (const link of s.links) {
      items.push({ ...link, path })
    }
    items.push(...flattenWithPath(s.children, path))
  }
  return items
}

const sections = parse()
const allLinks = flattenWithPath(sections)

const urlMap = {}
for (const link of allLinks) {
  if (!urlMap[link.url]) urlMap[link.url] = []
  urlMap[link.url].push(link.path)
}

const duplicates = Object.entries(urlMap)
  .filter(([, paths]) => paths.length > 1)
  .sort(([a], [b]) => a.localeCompare(b))

if (duplicates.length === 0) {
  console.log(`✅ No se encontraron enlaces duplicados (${allLinks.length} enlaces revisados)`)
  process.exit(0)
}

console.error(`\n❌ Se encontraron ${duplicates.length} enlace(s) duplicado(s):\n`)
for (const [url, paths] of duplicates) {
  console.error(`  ${url} (${paths.length} ocurrencias)`)
  for (const p of paths) {
    console.error(`    → ${p}`)
  }
  console.error('')
}

process.exit(1)
