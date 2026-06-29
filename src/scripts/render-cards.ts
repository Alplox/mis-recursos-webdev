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
  function render(item) {
    const sel = `[data-section-id="${item.id}${item._root ? '-links' : ''}"]`
    const grid = document.querySelector<HTMLElement>(`.link-grid${sel}`)
    if (!grid) return
    const fragment = document.createDocumentFragment()
    for (const link of item.links) {
      fragment.appendChild(createCard(link))
    }
    grid.appendChild(fragment)
  }

  function walk(items, rootLevel = true) {
    for (const item of items) {
      if (item.links.length > 0) {
        item._root = rootLevel
        render(item)
      }
      if (item.children.length > 0) {
        walk(item.children, false)
      }
    }
  }

  walk(sections)
}
