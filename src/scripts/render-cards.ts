export function escapeHtml(str: string) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export function createCard(link: { name: string; url: string; description?: string }) {
  const card = document.createElement('div')
  card.className = 'link-card animate-in'

  let domain = link.url
  try { domain = new URL(link.url).hostname.replace(/^www\./, '') } catch {}
  const firstChar = domain[0]?.toUpperCase() || '?'
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`

  card.innerHTML = `
    <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" class="link-card-main">
      <div class="favicon" data-initial="${escapeHtml(firstChar)}">
        <img src="${escapeHtml(faviconUrl)}" alt="" width="20" height="20" loading="lazy" onerror="this.remove()" />
      </div>
      <div class="info">
        <div class="name" title="${escapeHtml(link.name)}">${escapeHtml(link.name)}</div>
        ${link.description ? `<div class="description">${escapeHtml(link.description)}</div>` : ''}
      </div>
    </a>
    <div class="actions">
      <button class="action-btn copy-btn" onclick="event.stopPropagation();window.__copyLink('${escapeHtml(link.url)}')" title="Copiar URL">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-copy"/></svg>
      </button>
      <a href="https://github.com/Alplox/mis-recursos-webdev/issues/new?template=sugerir-cambio.md&title=Sugerencia: ${encodeURIComponent(link.name)}&body=URL: ${encodeURIComponent(link.url)}%0A---%0A" target="_blank" rel="noopener" class="action-btn edit-btn" onclick="event.stopPropagation()" title="Sugerir cambio">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-edit"/></svg>
      </a>
    </div>
  `

  return card
}

export function renderBrowseCards(sections: any[]) {
  const queue: Array<{ id: string; links: any[]; root: boolean }> = []

  function collect(item: any, rootLevel = true) {
    if (item.links.length > 0) {
      queue.push({ id: item.id, links: item.links, root: rootLevel })
    }
    for (const child of item.children) {
      collect(child, false)
    }
  }
  for (const section of sections) collect(section, true)

  function renderItem(item: { id: string; links: any[]; root: boolean }) {
    const sel = `[data-section-id="${item.id}${item.root ? '-links' : ''}"]`
    const grid = document.querySelector<HTMLElement>(`.link-grid${sel}`)
    if (!grid) return
    const frag = document.createDocumentFragment()
    for (const link of item.links) {
      frag.appendChild(createCard(link))
    }
    grid.appendChild(frag)
  }

  // First 3 grids sync (LCP)
  const n = Math.min(3, queue.length)
  for (let i = 0; i < n; i++) renderItem(queue[i])

  // Rest progressive, 1 grid per frame
  let i = n
  function next() {
    if (i >= queue.length) return
    renderItem(queue[i++])
    requestAnimationFrame(next)
  }
  if (i < queue.length) requestAnimationFrame(next)
}
