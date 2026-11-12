import { linkItemContentHtml, linkItemHtml } from '../lib/linkItem'

export function escapeHtml(str: string) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export { linkItemHtml }

export function createCard(link: { name: string; url: string; description?: string }, animate = false) {
  const item = document.createElement('li')
  item.className = animate ? 'link-item animate-in' : 'link-item'
  item.innerHTML = linkItemContentHtml(link)
  return item
}

function countLinks(section: any): number {
  let count = (section.links || []).length
  for (const child of section.children || []) count += countLinks(child)
  return count
}

function renderLinkGrid(title: string, links: any[], sectionId: string, level: number): string {
  const tag = level >= 5 ? 'h5' : level === 4 ? 'h4' : 'h3'
  const headerClass = level >= 5 ? 'lvl5-header' : level === 4 ? 'sub-subcategory-header' : 'subcategory-header'
  const skeletonCount = Math.min(links.length, 3)
  const skeletons = Array.from({ length: skeletonCount }, () => '<li class="link-skeleton" aria-hidden="true"><span class="skeleton-line"></span></li>').join('')
  const anchor = sectionId ? `<div id="${escapeHtml(sectionId)}" class="section-anchor"></div>` : ''
  const anchorBtn = sectionId
    ? `<button type="button" class="anchor-link-btn" data-anchor-id="${escapeHtml(sectionId)}" aria-label="Copiar enlace a ${escapeHtml(title)}" title="Copiar enlace a esta sección"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#icon-hash"/></svg></button>`
    : ''
  return `${anchor}<div class="${headerClass}"><${tag}>${anchorBtn}<span class="heading-text">${escapeHtml(title)}</span> <span class="count">${links.length}</span></${tag}></div><ul class="link-list" data-section-id="${escapeHtml(sectionId)}">${skeletons}</ul>`
}

function renderSectionGrids(section: any): string {
  let html = ''
  if (section.links && section.links.length > 0) {
    html += renderLinkGrid(`${section.name} (general)`, section.links, `${section.id}-links`, 2)
  }
  for (const child of (section.children || []).filter((c: any) => (c.links?.length || 0) > 0 || (c.children?.length || 0) > 0)) {
    html += renderLinkGrid(child.name, child.links || [], child.id, 3)
    for (const gc of (child.children || []).filter((c: any) => (c.links?.length || 0) > 0 || (c.children?.length || 0) > 0)) {
      html += renderLinkGrid(gc.name, gc.links || [], gc.id, 4)
      for (const ggc of (gc.children || []).filter((c: any) => (c.links?.length || 0) > 0)) {
        html += renderLinkGrid(ggc.name, ggc.links || [], ggc.id, 5)
      }
    }
  }
  return html
}

function renderPagination(prev: any, next: any, position: 'top' | 'bottom'): string {
  if (!prev && !next) return ''
  const cls = position === 'top' ? 'category-pagination category-pagination-top' : 'category-pagination category-pagination-bottom'
  const prevHtml = prev
    ? `<button type="button" class="category-nav-btn prev" data-goto="${escapeHtml(prev.id)}"><span class="dir">← Anterior</span><span class="name">${escapeHtml(prev.name)}</span></button>`
    : '<span></span>'
  const nextHtml = next
    ? `<button type="button" class="category-nav-btn next" data-goto="${escapeHtml(next.id)}"><span class="dir">Siguiente →</span><span class="name">${escapeHtml(next.name)}</span></button>`
    : '<span></span>'
  return `<nav class="${cls}" aria-label="Categorías anterior y siguiente">${prevHtml}${nextHtml}</nav>`
}

export function ensureCategorySection(sectionId: string, sections: any[]): boolean {
  const el = document.querySelector<HTMLElement>(`.categories-section[data-section="${sectionId}"]`)
  if (!el || el.dataset.built === '1') return false

  const renderable = sections
    .map((section: any) => ({ section, total: countLinks(section) }))
    .filter((x: any) => x.total > 0)
  const idx = renderable.findIndex((x: any) => x.section.id === sectionId)
  if (idx === -1) return false

  const { section, total } = renderable[idx]
  const prev = renderable[idx - 1]?.section
  const next = renderable[idx + 1]?.section

  el.innerHTML = `<div class="category-header" id="${escapeHtml(section.id)}"><h2><button type="button" class="anchor-link-btn" data-anchor-id="${escapeHtml(section.id)}" aria-label="Copiar enlace a ${escapeHtml(section.name)}" title="Copiar enlace a esta sección"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#icon-hash"/></svg></button><span class="heading-text">${escapeHtml(section.name)}</span></h2><span class="count-badge">${total}</span></div>${renderPagination(prev, next, 'top')}${renderSectionGrids(section)}${renderPagination(prev, next, 'bottom')}`
  el.dataset.built = '1'
  delete el.dataset.lazy
  return true
}

export function renderBrowseCards(sections: any[], activeTopId?: string | null) {
  const queue: Array<{ id: string; links: any[]; root: boolean; topId: string }> = []

  function collect(item: any, topId: string, rootLevel = true) {
    if ((item.links || []).length > 0) {
      queue.push({ id: item.id, links: item.links, root: rootLevel, topId })
    }
    for (const child of item.children || []) {
      collect(child, topId, false)
    }
  }
  for (const section of sections) collect(section, section.id, true)

  function renderItem(item: { id: string; links: any[]; root: boolean; topId: string }) {
    const sel = `[data-section-id="${item.id}${item.root ? '-links' : ''}"]`
    const list = document.querySelector<HTMLElement>(`.link-list${sel}`)
    if (!list || list.dataset.rendered === '1') return
    // SSR may have already rendered the final rows; avoid a replace that can shift layout.
    if (!list.querySelector('.link-skeleton') && list.querySelector('.link-item')) {
      list.dataset.rendered = '1'
      return
    }
    const frag = document.createDocumentFragment()
    for (const link of item.links) {
      frag.appendChild(createCard(link, false))
    }
    list.replaceChildren(frag)
    list.dataset.rendered = '1'
  }

  // Only the active category is visible; render the rest lazily when the user
  // navigates to them (showCategory builds + renders on demand). Rendering all
  // categories up front creates ~9k DOM nodes and long main-thread tasks.
  const activeQueue = activeTopId ? queue.filter(item => item.topId === activeTopId) : []
  for (const item of activeQueue) renderItem(item)
}
