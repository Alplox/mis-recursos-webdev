export function flattenData(sections) {
  const flat = []

  function walk(items, parents) {
    for (const item of items) {
      const section = [...parents, item.name].join(' › ')
      for (const link of item.links) {
        flat.push({ ...link, section, sectionId: item.id })
      }
      walk(item.children, [...parents, item.name])
    }
  }

  walk(sections, [])
  return flat
}

export function searchLinks(flatData, query) {
  if (!query || query.trim().length === 0) {
    return { results: [], grouped: null, total: flatData.length }
  }

  const q = query.toLowerCase().trim()
  const words = q.split(/\s+/).filter(Boolean)

  const results = flatData.filter(item =>
    words.every(word =>
      item.name.toLowerCase().includes(word) ||
      item.url.toLowerCase().includes(word) ||
      (item.description || '').toLowerCase().includes(word) ||
      item.section.toLowerCase().includes(word)
    )
  )

  const map = {}
  for (const r of results) {
    const key = r.section
    if (!map[key]) map[key] = { name: key, links: [] }
    map[key].links.push(r)
  }
  const grouped = Object.values(map).sort((a, b) => a.name.localeCompare(b.name))

  return { results, grouped, total: results.length }
}
