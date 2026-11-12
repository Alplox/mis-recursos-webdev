import { createCard, renderBrowseCards, ensureCategorySection, escapeHtml } from './render-cards'

declare global {
  interface Window {
    __toggleSidebar: () => void
    __toggleSearch: () => void
    __goToSection: (id: string) => void
    __toggleTheme: () => string
    __copyLink: (url: string, btn?: HTMLElement | null) => Promise<void>
    __search: (query: string) => void
    __recursosData: any
  }
}

const overlay = document.getElementById('sidebar-overlay')!
const sidebar = document.getElementById('sidebar')!
let sidebarOpen = false

// Mobile bottom sheet drag support
let touchStartY = 0
let touchCurrentY = 0
let isDraggingSidebar = false
let suppressNavClick = false

// Fully hidden distance in px: own height + the gap reserved for the bottom nav.
// Uses the computed `bottom` so it always matches the CSS variable (portrait/landscape).
function sidebarHiddenOffset(): number {
  if (!sidebar) return 0
  const bottom = parseFloat(getComputedStyle(sidebar).bottom) || 0
  return sidebar.offsetHeight + bottom
}

function initMobileSidebarDrag() {
  if (!sidebar) return
  const handleDragStart = (e: TouchEvent) => {
    if (window.innerWidth > 768) return
    // Only the header works as a drag handle: touches inside the scrollable TOC
    // must scroll it instead of dragging/closing the sheet.
    if ((e.target as HTMLElement).closest('.sidebar-content')) return
    const touch = e.touches[0]
    touchStartY = touch.clientY
    touchCurrentY = touch.clientY
    isDraggingSidebar = true
    sidebar.style.transition = 'none'
  }
  const handleDragMove = (e: TouchEvent) => {
    if (!isDraggingSidebar || window.innerWidth > 768) return
    const touch = e.touches[0]
    touchCurrentY = touch.clientY
    const deltaY = touchCurrentY - touchStartY
    if (sidebarOpen) {
      if (deltaY > 0) {
        sidebar.style.transform = `translateY(${deltaY}px)`
      }
    } else if (deltaY < 0) {
      const progress = Math.min(Math.abs(deltaY), 220) / 220
      sidebar.style.transform = `translateY(${sidebarHiddenOffset() * (1 - progress)}px)`
    }
  }
  const handleDragEnd = () => {
    if (!isDraggingSidebar) return
    const deltaY = touchCurrentY - touchStartY
    const wasOpen = sidebarOpen
    isDraggingSidebar = false
    touchStartY = 0
    touchCurrentY = 0
    sidebar.style.transition = ''
    if (window.innerWidth > 768) {
      sidebar.style.transform = ''
      return
    }
    // Clear the inline transform (and toggle the class in the same frame) so the
    // transition animates from the dragged position to the CSS-defined state.
    if (wasOpen && deltaY > 50) {
      toggleSidebar(false)
    } else if (!wasOpen && deltaY < -30) {
      // Swiping up from the nav also emits a click on it; avoid reopening/closing.
      suppressNavClick = true
      window.setTimeout(() => { suppressNavClick = false }, 0)
      toggleSidebar(true)
    } else {
      sidebar.style.transform = ''
    }
  }

  sidebar.addEventListener('touchstart', handleDragStart, { passive: true })
  sidebar.addEventListener('touchmove', handleDragMove, { passive: true })
  sidebar.addEventListener('touchend', handleDragEnd, { passive: true })
  sidebar.addEventListener('touchcancel', handleDragEnd, { passive: true })

  // Also allow dragging from bottom edge to open
  const bottomNav = document.querySelector('.bottom-nav')
  bottomNav?.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 768 || sidebarOpen) return
    const touch = (e as TouchEvent).touches[0]
    touchStartY = touch.clientY
    touchCurrentY = touch.clientY
    isDraggingSidebar = true
    sidebar.style.transition = 'none'
  }, { passive: true })
  // The touch stays targeted at the nav that started the gesture, so the sheet
  // needs the move/end handlers there too for the swipe-up-to-open gesture.
  bottomNav?.addEventListener('touchmove', handleDragMove, { passive: true })
  bottomNav?.addEventListener('touchend', handleDragEnd, { passive: true })
  bottomNav?.addEventListener('touchcancel', handleDragEnd, { passive: true })
}

function updateSidebarToggleState() {
  const btn = document.getElementById('bottom-nav-index')
  btn?.classList.toggle('active', sidebarOpen && window.innerWidth <= 768)
  btn?.setAttribute('aria-expanded', String(sidebarOpen && window.innerWidth <= 768))

  const hamburger = document.getElementById('main-hamburger')
  if (hamburger) {
    hamburger.classList.toggle('is-open', sidebarOpen)
    hamburger.setAttribute('aria-expanded', String(sidebarOpen))
    hamburger.setAttribute('aria-label', sidebarOpen ? 'Cerrar menú' : 'Abrir menú')
  }
}

function toggleSidebar(open: boolean) {
  sidebarOpen = open
  const isMobile = window.innerWidth <= 768
  if (isMobile) {
    sidebar?.classList.toggle('open', open)
    if (sidebar) {
      // CSS owns the open/closed transforms (see --bottom-nav-total), so we only
      // drop any inline transform left by a drag gesture.
      sidebar.style.transition = ''
      sidebar.style.transform = ''
    }
    overlay?.classList.toggle('open', open)
    document.body.style.overflow = open ? 'hidden' : ''
    const main = document.querySelector('.main-content') as HTMLElement
    if (main) main.style.marginLeft = '0'
  } else {
    sidebar?.classList.remove('open')
    sidebar?.classList.toggle('closed', !open)
    const main = document.querySelector('.main-content') as HTMLElement
    sidebar!.style.transform = open ? '' : 'translateX(-100%)'
    main!.style.marginLeft = open ? '' : '0'
    overlay?.classList.remove('open')
    document.body.style.overflow = ''
  }
  updateSidebarToggleState()
}

overlay?.addEventListener('click', () => toggleSidebar(false))

window.__toggleSidebar = () => toggleSidebar(!sidebarOpen)

function toggleSearch(_open?: boolean) {
  searchInput?.focus()
  searchInput?.scrollIntoView({ block: 'nearest' })
}

window.__toggleSearch = () => toggleSearch(true)

function setActionFeedback(btn: HTMLElement | null, state: 'success' | 'error', message: string) {
  if (!btn) return
  const useEl = btn.querySelector('use') as SVGUseElement | null
  const prevHref = useEl?.getAttribute('href') || ''
  const prevLabel = btn.getAttribute('aria-label') || ''
  const prevTitle = btn.getAttribute('title') || ''
  const icon = state === 'success' ? '#icon-check' : '#icon-alert'

  clearTimeout((btn as any)._feedbackTimer)
  btn.classList.remove('action-feedback-success', 'action-feedback-error', 'action-feedback-pop')

  if (useEl) useEl.setAttribute('href', icon)
  btn.classList.add(state === 'success' ? 'action-feedback-success' : 'action-feedback-error', 'action-feedback-pop')
  btn.setAttribute('aria-label', message)
  if (prevTitle) btn.setAttribute('title', message)

  let sr = btn.querySelector('.action-feedback-sr') as HTMLElement | null
  if (!sr) {
    sr = document.createElement('span')
    sr.className = 'action-feedback-sr'
    sr.setAttribute('aria-live', 'polite')
    sr.style.position = 'absolute'
    sr.style.width = '1px'
    sr.style.height = '1px'
    sr.style.padding = '0'
    sr.style.margin = '-1px'
    sr.style.overflow = 'hidden'
    sr.style.clip = 'rect(0, 0, 0, 0)'
    sr.style.whiteSpace = 'nowrap'
    sr.style.border = '0'
    btn.appendChild(sr)
  }
  sr.textContent = message

  ;(btn as any)._feedbackTimer = setTimeout(() => {
    btn.classList.remove('action-feedback-success', 'action-feedback-error', 'action-feedback-pop')
    if (useEl && prevHref) useEl.setAttribute('href', prevHref)
    if (prevLabel) btn.setAttribute('aria-label', prevLabel)
    else btn.removeAttribute('aria-label')
    if (prevTitle) btn.setAttribute('title', prevTitle)
    if (sr) sr.textContent = ''
  }, 1800)
}

// --- TOC SVG rails (Cloudflare-like) ---
let tocRailRaf = 0
function scheduleTocRails() {
  if (tocRailRaf) cancelAnimationFrame(tocRailRaf)
  tocRailRaf = requestAnimationFrame(() => {
    tocRailRaf = 0
    renderTocRails()
  })
}

function renderTocRails() {
  const wrap = document.getElementById('toc-rail-wrap')
  const muted = document.getElementById('toc-rail-muted') as SVGSVGElement | null
  const activeRail = document.getElementById('toc-rail-active') as SVGSVGElement | null
  const content = document.getElementById('toc-content')
  if (!wrap || !muted || !activeRail || !content) return

  const toggles = Array.from(content.querySelectorAll<HTMLElement>('.sidebar-section-toggle'))
  const visible: Array<{ el: HTMLElement; level: number; y: number; h: number }> = []
  const wrapRect = wrap.getBoundingClientRect()

  for (const el of toggles) {
    const section = el.closest('.sidebar-section') as HTMLElement | null
    if (!section || section.classList.contains('hidden')) continue
    // skip if inside any collapsed children container
    let parentChildren = section.parentElement?.closest('.sidebar-children') as HTMLElement | null
    let hiddenByCollapse = false
    while (parentChildren && content.contains(parentChildren)) {
      if (!parentChildren.classList.contains('open')) { hiddenByCollapse = true; break }
      parentChildren = parentChildren.parentElement?.closest('.sidebar-children') as HTMLElement | null
    }
    if (hiddenByCollapse) continue
    // also if this element itself is not rendered (e.g. display none via hidden ancestor already handled) - check size
    const r = el.getBoundingClientRect()
    if (r.height <= 0 || r.width <= 0) continue
    const level = parseInt(el.dataset.tocLevel || '0', 10) || 0
    const y = r.top - wrapRect.top
    visible.push({ el, level, y, h: r.height })
  }

  const h = Math.max(content.scrollHeight, wrap.scrollHeight, 1)
  const w = 60
  muted.setAttribute('viewBox', `0 0 ${w} ${h}`)
  muted.setAttribute('width', String(w))
  muted.setAttribute('height', String(h))
  activeRail.setAttribute('viewBox', `0 0 ${w} ${h}`)
  activeRail.setAttribute('width', String(w))
  activeRail.setAttribute('height', String(h))

  if (visible.length === 0) {
    muted.innerHTML = ''
    activeRail.innerHTML = ''
    activeRail.style.clipPath = 'inset(0 0 100% 0)'
    return
  }

  const xFor = (level: number) => 10 + level * 12
  const yMid = (item: { y: number; h: number }) => item.y + item.h / 2

  let d = ''
  const first = visible[0]
  let prevX = xFor(first.level)
  let prevY = yMid(first)
  d += `M${prevX} ${Math.max(0, first.y + 4)}`

  for (let i = 0; i < visible.length; i++) {
    const item = visible[i]
    const x = xFor(item.level)
    const y = yMid(item)
    const top = item.y + 4
    const bottom = item.y + item.h - 4
    if (i === 0) {
      d += ` L${x} ${bottom}`
      prevX = x; prevY = bottom
      continue
    }
    const prevItem = visible[i - 1]
    const prevBottom = prevItem.y + prevItem.h - 4
    if (x === prevX) {
      d += ` L${x} ${bottom}`
    } else {
      const midY = (prevBottom + top) / 2
      const c = Math.min(8, Math.abs(top - prevBottom) / 2)
      d += ` L${prevX} ${prevBottom}`
      d += ` C ${prevX} ${prevBottom + c}, ${x} ${top - c}, ${x} ${top}`
      d += ` L${x} ${bottom}`
    }
    prevX = x; prevY = bottom
  }

  const path = `<path d="${d}" fill="none" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"></path>`
  muted.innerHTML = path
  activeRail.innerHTML = path.replace('stroke-width="1"', 'stroke-width="2"')

  // active segment clip
  const activeIdx = visible.findIndex(v => v.el.classList.contains('active'))
  if (activeIdx >= 0) {
    const item = visible[activeIdx]
    const top = Math.max(0, item.y)
    const bottom = item.y + item.h
    activeRail.style.clipPath = `inset(${top}px 0 ${Math.max(0, h - bottom)}px 0)`
  } else {
    activeRail.style.clipPath = 'inset(0 0 100% 0)'
  }
}

// --- Sidebar section toggles ---
function initSidebarSections() {
  document.querySelectorAll('.sidebar-section-toggle').forEach(toggle => {
    const key = 'sidebar-' + (toggle as HTMLElement).dataset.sectionId
    const children = toggle.nextElementSibling
    const arrow = toggle.querySelector('.arrow')

    try {
      const saved = sessionStorage.getItem(key)
      if (saved === 'open') {
        children?.classList.add('open')
        arrow?.classList.add('open')
      }
    } catch {}

    toggle.addEventListener('click', (e) => {
      e.stopPropagation()
      const isOpen = children?.classList.contains('open')
      if (isOpen) {
        children?.classList.remove('open')
        arrow?.classList.remove('open')
        try { sessionStorage.setItem(key, 'closed') } catch {}
      } else {
        children?.classList.add('open')
        arrow?.classList.add('open')
        try { sessionStorage.setItem(key, 'open') } catch {}
      }

      scheduleTocRails()
      if (children) {
        const onEnd = (ev: TransitionEvent) => {
          if (ev.propertyName !== 'max-height') return
          children.removeEventListener('transitionend', onEnd)
          scheduleTocRails()
        }
        children.addEventListener('transitionend', onEnd)
        // update during transition
        let frames = 0
        const tick = () => {
          renderTocRails()
          if (++frames < 12) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }

      if ((e.target as HTMLElement).closest('.arrow')) return

      const id = (toggle as HTMLElement).dataset.sectionId
      if (id) window.__goToSection(id)

      if (window.innerWidth <= 768) {
        toggleSidebar(false)
      }
    })
  })
  scheduleTocRails()
}

// --- Theme icon ---
function updateThemeIcon() {
  const moon = document.getElementById('theme-icon-moon')
  const sun = document.getElementById('theme-icon-sun')
  if (!moon || !sun) return
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  moon.classList.toggle('active', !isLight)
  sun.classList.toggle('active', isLight)
}

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  window.__toggleTheme()
})

const themeObserver = new MutationObserver(updateThemeIcon)
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

// --- Bookmark export ---
function renderSection(section: any, depth: number): string {
  if (section.links.length === 0 && section.children.length === 0) return ''
  const indent = '    '.repeat(depth)
  let html = `${indent}<DT><H3>${escapeHtml(section.name)}</H3>\n`
  html += `${indent}<DL><p>\n`
  const linkIndent = '    '.repeat(depth + 1)
  for (const link of section.links) {
    const annotation = link.description ? ` (${link.description})` : ''
    const url = escapeHtml(link.url).replace(/"/g, '&quot;')
    html += `${linkIndent}<DT><A HREF="${url}">${escapeHtml(link.url)}${annotation}</A>\n`
  }
  for (const child of section.children) {
    html += renderSection(child, depth + 1)
  }
  html += `${indent}</DL><p>\n`
  return html
}

function generateBookmarks(sections: any[]) {
  let html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n'
  html += '<!-- This is an automatically generated file.\n'
  html += '     It will be read and overwritten.\n'
  html += '     DO NOT EDIT! -->\n'
  html += '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n'
  html += '<TITLE>Bookmarks</TITLE>\n'
  html += '<H1>Bookmarks</H1>\n'
  html += '<DL><p>\n'
  html += '    <DT><H3>mis-recursos-webdev</H3>\n'
  html += '    <DL><p>\n'
  for (const section of sections) {
    html += renderSection(section, 2)
  }
  html += '    </DL><p>\n'
  html += '</DL><p>\n'
  return html
}

document.getElementById('bookmark-export')?.addEventListener('click', () => {
  const btn = document.getElementById('bookmark-export')
  const data = (window as any).__recursosData
  if (!data) {
    setActionFeedback(btn, 'error', 'No hay datos para exportar')
    return
  }
  try {
    const now = new Date()
    const html = generateBookmarks(data)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mis-recursos-webdev-bookmarks_${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setActionFeedback(btn, 'success', 'Bookmarks exportados')
  } catch {
    setActionFeedback(btn, 'error', 'Error al exportar bookmarks')
  }
})

window.__copyLink = async (url: string, btn?: HTMLElement | null) => {
  const target = btn || null
  try {
    await navigator.clipboard.writeText(url)
    setActionFeedback(target, 'success', 'URL copiada')
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setActionFeedback(target, 'success', 'URL copiada')
    } catch {
      setActionFeedback(target, 'error', 'No se pudo copiar la URL')
    }
  }
}

// --- Data loading ---
let fullData: any = null
let flat: any[] | null = null
let sectionLookup: Record<string, string> = {}
let idToTopLevel: Record<string, string> = {}
let idToMeta: Record<string, { name: string; parentId: string | null; topId: string }> = {}
let currentActiveId: string | null = null
let isSearchActive = false
let currentCategoryId: string | null = null
let programmaticTargetId: string | null = null
let programmaticScrollTimer: ReturnType<typeof setTimeout> | null = null
let programmaticScrollStart = 0
let programmaticBestDelta: number | null = null
let searchLinksFn: ((data: any[], query: string) => { results: any[]; grouped: any[]; total: number }) | null = null

function countLinksSafe(section: any): number {
  let count = (section?.links || []).length
  for (const child of section?.children || []) count += countLinksSafe(child)
  return count
}

function buildSectionLookup(sections: any[], parentPath = '') {
  for (const s of sections) {
    const path = parentPath ? `${parentPath} › ${s.name}` : s.name
    sectionLookup[path] = s.id
    buildSectionLookup(s.children, path)
  }
}

function buildIdMaps(sections: any[]) {
  function walk(items: any[], topId: string, parentId: string | null) {
    for (const item of items) {
      idToTopLevel[item.id] = topId
      idToMeta[item.id] = { name: item.name, parentId, topId }
      walk(item.children, topId, item.id)
    }
  }
  for (const s of sections) {
    idToTopLevel[s.id] = s.id
    idToMeta[s.id] = { name: s.name, parentId: null, topId: s.id }
    walk(s.children, s.id, s.id)
  }
}

function getBreadcrumbPath(id: string | null): Array<{ id: string; name: string }> {
  if (!id || !idToMeta[id]) return []
  const path: Array<{ id: string; name: string }> = []
  let cur: string | null = id
  while (cur && idToMeta[cur]) {
    path.unshift({ id: cur, name: idToMeta[cur].name })
    const parent = idToMeta[cur].parentId
    cur = parent && parent !== cur ? parent : null
  }
  return path
}

function updateBreadcrumb(activeId?: string | null) {
  const nav = document.getElementById('breadcrumb') as HTMLElement | null
  if (!nav) return
  if (isSearchActive) {
    nav.innerHTML = ''
    nav.style.display = 'none'
    return
  }
  const id = activeId ?? currentActiveId ?? currentCategoryId
  const path = getBreadcrumbPath(id)
  if (path.length === 0) {
    nav.innerHTML = ''
    nav.style.display = 'none'
    return
  }
  nav.style.display = ''
  nav.innerHTML = path.map((item, i) => {
    const isLast = i === path.length - 1
    const label = escapeHtml(item.name)
    if (isLast) return `<span class="breadcrumb-current" aria-current="page">${label}</span>`
    return `<button type="button" class="breadcrumb-link" data-id="${item.id}">${label}</button>`
  }).join('<span class="breadcrumb-sep" aria-hidden="true">›</span>')
}

function expandSidebarTo(id: string) {
  const toggle = document.querySelector<HTMLElement>(`.sidebar-section-toggle[data-section-id="${id}"]`)
  if (!toggle) return
  const section = toggle.closest('.sidebar-section')
  if (section) expandParents(section)
  requestAnimationFrame(() => {
    toggle.scrollIntoView({ block: 'nearest' })
  })
}

function setProgrammaticTarget(id: string | null) {
  programmaticTargetId = id
  programmaticBestDelta = null
  if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer)
  if (id) {
    programmaticScrollStart = Date.now()
    // Safety fallback only; normal release happens when target position is reached or user interrupts
    programmaticScrollTimer = setTimeout(() => {
      programmaticTargetId = null
      programmaticScrollTimer = null
      programmaticBestDelta = null
    }, 2500)
  } else {
    programmaticScrollTimer = null
  }
}

function showCategory(topLevelId: string, scrollToId?: string) {
  if (!topLevelId) return
  if (fullData) {
    const built = ensureCategorySection(topLevelId, fullData)
    if (built) {
      const queue: Array<{ id: string; links: any[]; root: boolean; topId: string }> = []
      function collect(item: any, topId: string, rootLevel = true) {
        if ((item.links || []).length > 0) queue.push({ id: item.id, links: item.links, root: rootLevel, topId })
        for (const child of item.children || []) collect(child, topId, false)
      }
      const section = fullData.find((s: any) => s.id === topLevelId)
      if (section) collect(section, topLevelId, true)
      for (const item of queue) {
        const sel = `[data-section-id="${item.id}${item.root ? '-links' : ''}"]`
        const list = document.querySelector<HTMLElement>(`.link-list${sel}`)
        if (!list || list.dataset.rendered === '1') continue
        const frag = document.createDocumentFragment()
        for (const link of item.links) frag.appendChild(createCard(link, false))
        list.replaceChildren(frag)
        list.dataset.rendered = '1'
      }
    }
  }
  currentCategoryId = topLevelId
  document.querySelectorAll<HTMLElement>('.categories-section').forEach(sec => {
    sec.classList.toggle('active', sec.dataset.section === topLevelId)
  })
  document.querySelectorAll('.sidebar-section.highlight').forEach(s => s.classList.remove('highlight'))

  const setSidebarActive = (id: string) => {
    currentActiveId = id
    document.querySelectorAll('.sidebar-section-toggle.active').forEach(t => t.classList.remove('active'))
    document.querySelector(`.sidebar-section-toggle[data-section-id="${id}"]`)?.classList.add('active')
    updateBreadcrumb(id)
  }

  if (scrollToId) {
    setProgrammaticTarget(scrollToId)
    expandSidebarTo(scrollToId)
    requestAnimationFrame(() => {
      const el = document.getElementById(scrollToId)
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 80
        window.scrollTo({ top, behavior: 'smooth' })
      }
      setSidebarActive(scrollToId)
    })
  } else {
    setProgrammaticTarget(null)
    window.scrollTo({ top: 0, behavior: 'auto' })
    setSidebarActive(topLevelId)
  }
}

async function loadData() {
  try {
    const res = await fetch('/data/recursos.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    fullData = await res.json()
    sectionLookup = {}
    idToTopLevel = {}
    idToMeta = {}
    buildSectionLookup(fullData)
    buildIdMaps(fullData)
    ;(window as any).__recursosData = fullData
  } catch (e) {
    console.error('Error loading resource data:', e)
    const browse = document.getElementById('browse-content')
    if (browse) {
      browse.innerHTML = '<div class="empty-state" style="display:block;grid-column:1/-1"><p>Error al cargar los datos. <a href="javascript:location.reload()">Reintentar</a></p></div>'
    }
  }
}

// --- Search ---
window.__search = async (query: string) => {
  if (!fullData) return
  const browse = document.getElementById('browse-content')!
  const searchResults = document.getElementById('search-results')!
  const searchHeader = document.getElementById('search-header')!
  const searchContent = document.getElementById('search-results-content')!
  const emptyState = document.getElementById('empty-state')!
  const emptyQuery = document.getElementById('empty-query')!

  if (!query || query.trim().length === 0) {
    clearSearchView()
    if (currentCategoryId) showCategory(currentCategoryId)
    updateBreadcrumb(currentActiveId || currentCategoryId)
    return
  }

  isSearchActive = true
  updateBreadcrumb(null)

  if (!flat) {
    const mod = await import('../lib/search')
    flat = mod.flattenData(fullData)
    searchLinksFn = mod.searchLinks
  }

  const { results, grouped, total } = searchLinksFn!(flat, query)

  browse.style.display = 'none'
  emptyState.style.display = 'none'

  if (total === 0) {
    searchResults.style.display = 'none'
    emptyState.style.display = ''
    if (emptyQuery) emptyQuery.textContent = query
    return
  }

  searchResults.style.display = ''
  if (searchHeader) {
    searchHeader.innerHTML = `<span class="search-count">${total} resultado${total !== 1 ? 's' : ''}</span><span class="search-for"> para </span><span class="search-query">"${escapeHtml(query)}"</span>`
  }

  if (searchContent) {
    searchContent.innerHTML = ''
    if (grouped && grouped.length > 0) {
      for (const group of grouped) {
        const section = document.createElement('section')
        section.className = 'categories-section active search-group'

        const header = document.createElement('div')
        header.className = 'category-header search-group-header'
        const segs = group.name.split(' › ')
        let acc = ''
        const pathHtml = segs.map((seg: string, i: number) => {
          acc = acc ? `${acc} › ${seg}` : seg
          const id = sectionLookup[acc] || ''
          const last = i === segs.length - 1 ? ' path-segment-current' : ''
          return `<button type="button" class="path-segment${last}" data-goto="${escapeHtml(id)}">${escapeHtml(seg)}</button>`
        }).join('<span class="path-sep" aria-hidden="true">›</span>')
        header.innerHTML = `<h2 class="search-group-path">${pathHtml}</h2><span class="count-badge">${group.links.length}</span>`
        section.appendChild(header)

        const list = document.createElement('ul')
        list.className = 'link-list'

        for (const link of group.links) {
          const card = createCard(link, true)
          list.appendChild(card)
        }

        section.appendChild(list)
        searchContent.appendChild(section)
      }
    }
  }
}

const searchInput = document.getElementById('search-input') as HTMLInputElement | null
const clearBtn = document.getElementById('search-clear')

let debounceTimer: ReturnType<typeof setTimeout>
searchInput?.addEventListener('input', () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const q = searchInput!.value
    clearBtn?.classList.toggle('visible', q.length > 0)
    window.__search(q)
  }, 150)
})

clearBtn?.addEventListener('click', () => {
  if (searchInput) {
    searchInput.value = ''
    searchInput.focus()
  }
  clearBtn?.classList.remove('visible')
  window.__search('')
})

function clearSearchView() {
  const browse = document.getElementById('browse-content')
  const searchResults = document.getElementById('search-results')
  const emptyState = document.getElementById('empty-state')
  isSearchActive = false
  if (browse) browse.style.display = ''
  if (searchResults) searchResults.style.display = 'none'
  if (emptyState) emptyState.style.display = 'none'
}

window.__goToSection = async (id: string) => {
  if (!id) return
  clearTimeout(debounceTimer)
  if (searchInput) searchInput.value = ''
  clearBtn?.classList.remove('visible')
  clearSearchView()

  const topId = idToTopLevel[id] || id
  const scrollToId = id !== topId ? id : undefined
  showCategory(topId, scrollToId)

  if (!scrollToId) expandSidebarTo(topId)
  if (window.innerWidth <= 768) toggleSidebar(false)
  try { history.replaceState(null, '', '#' + id) } catch {}
}

document.addEventListener('keydown', (e) => {
  if (e.key === '/') {
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault()
      toggleSearch(true)
    }
  }
  if (e.key === 'Escape' && sidebarOpen && window.innerWidth <= 768) {
    toggleSidebar(false)
  }
})

// --- Sidebar section filter ---
function expandParents(section: Element) {
  let parent = section.parentElement?.closest('.sidebar-section')
  let changed = false
  while (parent) {
    const children = parent.querySelector(':scope > .sidebar-children') as HTMLElement | null
    const arrow = parent.querySelector(':scope > .sidebar-section-toggle .arrow')
    if (children && !children.classList.contains('open')) {
      children.classList.add('open')
      arrow?.classList.add('open')
      try { sessionStorage.setItem('sidebar-' + (parent as HTMLElement).dataset.sectionId, 'open') } catch {}
      changed = true
      children.addEventListener('transitionend', (ev) => {
        if (ev.propertyName === 'max-height') scheduleTocRails()
      }, { once: true })
    }
    parent = parent.parentElement?.closest('.sidebar-section')
  }
  scheduleTocRails()
  if (changed) {
    let frames = 0
    const tick = () => {
      renderTocRails()
      if (++frames < 12) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
}

function __filterSidebar(query: string) {
  const allSections = document.querySelectorAll('#sidebar-content .sidebar-section')
  const q = query.trim().toLowerCase()
  const hasQuery = q.length > 0
  let firstMatch: Element | null = null

  const matchMap = new Map<Element, boolean>()
  allSections.forEach(section => {
    const label = section.querySelector('.sidebar-section-toggle .label')
    const name = label?.textContent?.toLowerCase() || ''
    matchMap.set(section, hasQuery && name.includes(q))
  })

  function hasVisibleDescendant(section: Element): boolean {
    const children = section.querySelector(':scope > .sidebar-children')
    if (!children) return false
    return [...children.children].some(child => {
      if (!child.classList.contains('sidebar-section')) return false
      if (matchMap.get(child)) return true
      return hasVisibleDescendant(child)
    })
  }

  allSections.forEach(section => {
    const selfMatch = matchMap.get(section)
    const childMatch = hasVisibleDescendant(section)
    const visible = !hasQuery || selfMatch || childMatch

    section.classList.toggle('hidden', !visible)
    section.classList.toggle('highlight', !!selfMatch)

    if (selfMatch && !firstMatch) {
      firstMatch = section
    }

    if (hasQuery && (selfMatch || childMatch)) {
      expandParents(section)
    }
  })

  if (firstMatch && hasQuery) {
    ;(firstMatch as Element).scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
  scheduleTocRails()
}

const sidebarSearchInput = document.getElementById('sidebar-search-input') as HTMLInputElement | null
let sidebarDebounceTimer: ReturnType<typeof setTimeout>
sidebarSearchInput?.addEventListener('input', () => {
  clearTimeout(sidebarDebounceTimer)
  sidebarDebounceTimer = setTimeout(() => {
    __filterSidebar(sidebarSearchInput!.value)
  }, 150)
})

// --- Active section tracking ---
function initActiveSection() {
  function getTargets() {
    return Array.from(document.querySelectorAll<HTMLElement>('.category-header[id], .section-anchor[id]'))
      .filter(el => el.classList.contains('category-header') || !el.id.endsWith('-links'))
  }

  function setActive(id: string | null) {
    if (!id) return
    currentActiveId = id
    document.querySelectorAll('.sidebar-section-toggle.active').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.sidebar-section.highlight').forEach(s => s.classList.remove('highlight'))
    const toggle = document.querySelector(`.sidebar-section-toggle[data-section-id="${id}"]`) as HTMLElement | null
    toggle?.classList.add('active')
    updateBreadcrumb(id)
    scheduleTocRails()
  }

  function update() {
    let reachedProgrammaticTarget: string | null = null
    if (programmaticTargetId) {
      const target = document.getElementById(programmaticTargetId)
      if (target) {
        const rawDelta = target.getBoundingClientRect().top - 80
        const delta = Math.abs(rawDelta)
        const elapsed = Date.now() - programmaticScrollStart
        if (programmaticBestDelta === null || delta < programmaticBestDelta) {
          programmaticBestDelta = delta
        }
        const movingAway = delta > programmaticBestDelta + 8
        // Release if user scrolled away (distance growing) after initial jump, or if taking too long while far
        if ((elapsed > 120 && movingAway) || (elapsed > 1200 && delta > 80)) {
          setProgrammaticTarget(null)
        } else if (delta < 4) {
          reachedProgrammaticTarget = programmaticTargetId
          setProgrammaticTarget(null)
        } else {
          setActive(programmaticTargetId)
          return
        }
      } else {
        setProgrammaticTarget(null)
      }
    }

    const activeSection = document.querySelector<HTMLElement>('.categories-section.active')
    if (!activeSection) return
    const targets = getTargets()
    const visibleTargets = targets.filter(t => activeSection.contains(t))
    if (visibleTargets.length === 0) return

    const headerOffset = 80
    let activeId: string | null = null

    for (const target of visibleTargets) {
      const rect = target.getBoundingClientRect()
      if (rect.top <= headerOffset + 4) {
        activeId = target.id
      } else if (activeId === null) {
        activeId = target.id
        break
      }
    }

    setActive(reachedProgrammaticTarget || activeId)
  }

  update()
  let ticking = false
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { update(); ticking = false })
      ticking = true
    }
  }, { passive: true })

  const clearProgrammaticOnUserScroll = () => {
    if (programmaticTargetId) setProgrammaticTarget(null)
  }
  window.addEventListener('wheel', clearProgrammaticOnUserScroll, { passive: true })
  window.addEventListener('touchstart', clearProgrammaticOnUserScroll, { passive: true })
  window.addEventListener('touchmove', clearProgrammaticOnUserScroll, { passive: true })
  window.addEventListener('pointerdown', clearProgrammaticOnUserScroll, { passive: true })
  window.addEventListener('mousedown', clearProgrammaticOnUserScroll, { passive: true })
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
      clearProgrammaticOnUserScroll()
    }
  })
  window.addEventListener('scrollend', () => {
    if (programmaticTargetId) {
      requestAnimationFrame(() => update())
    }
  })
}

function handleHash() {
  if (!fullData) return
  const id = location.hash.slice(1)
  if (id) {
    window.__goToSection(id)
  } else if (fullData.length > 0) {
    showCategory(fullData[0].id)
  }
}

window.addEventListener('hashchange', handleHash)

function setStableViewport() {
  if (window.innerWidth > 768) return
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

function applyStableViewport() {
  setStableViewport()
}

// ponytail: reset residual sidebar state que cache de Cloudflare pueda pegar
function syncSidebar() {
  const isMobile = window.innerWidth <= 768
  sidebar?.classList.remove('closed', 'open')
  if (sidebar) {
    sidebar.style.transition = ''
    sidebar.style.transform = ''
  }
  const main = document.querySelector('.main-content') as HTMLElement
  if (main) main.style.marginLeft = isMobile ? '0' : ''
  sidebarOpen = !isMobile
  overlay?.classList.remove('open')
  document.body.style.overflow = ''
  updateSidebarToggleState()
  applyStableViewport()
}

window.addEventListener('resize', () => {
  syncSidebar()
  scheduleTocRails()
  applyStableViewport()
})

window.addEventListener('orientationchange', () => {
  setTimeout(applyStableViewport, 100)
})

function initInteractions() {
  document.getElementById('bottom-nav-index')?.addEventListener('click', () => {
    if (suppressNavClick) return
    window.__toggleSidebar()
  })
  document.getElementById('bottom-nav-search')?.addEventListener('click', () => {
    if (window.innerWidth <= 768 && sidebarOpen) toggleSidebar(false)
    toggleSearch(true)
  })
  document.getElementById('breadcrumb')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.breadcrumb-link[data-id]')
    if (btn?.dataset.id) window.__goToSection(btn.dataset.id)
  })
  document.getElementById('main-hamburger')?.addEventListener('click', () => window.__toggleSidebar())
  document.getElementById('sidebar-close-btn')?.addEventListener('click', () => window.__toggleSidebar())

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const anchorBtn = target.closest<HTMLButtonElement>('.anchor-link-btn[data-anchor-id]')
    if (anchorBtn) {
      e.preventDefault()
      e.stopPropagation()
      const id = anchorBtn.dataset.anchorId || ''
      const url = `${location.origin}${location.pathname}#${id}`
      window.__copyLink(url, anchorBtn)
      return
    }
    const copyBtn = target.closest<HTMLButtonElement>('.copy-btn[data-copy-url]')
    if (copyBtn) {
      e.preventDefault()
      e.stopPropagation()
      window.__copyLink(copyBtn.dataset.copyUrl || '', copyBtn)
      return
    }
    const reportBtn = target.closest<HTMLElement>('.report-btn')
    if (reportBtn) {
      e.stopPropagation()
      return
    }
    const goto = target.closest<HTMLElement>('[data-goto]')
    if (goto?.dataset.goto) {
      e.preventDefault()
      window.__goToSection(goto.dataset.goto)
    }
  })

  updateSidebarToggleState()
}

function initScrollToTop() {
  const btn = document.getElementById('scroll-to-top') as HTMLButtonElement | null
  if (!btn) return

  const toggle = () => {
    const show = window.scrollY > 320
    btn.classList.toggle('visible', show)
    btn.setAttribute('aria-hidden', String(!show))
    btn.tabIndex = show ? 0 : -1
  }

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  let ticking = false
  window.addEventListener('scroll', () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      toggle()
      ticking = false
    })
  }, { passive: true })

  toggle()
}

// --- Init ---
async function init() {
  applyStableViewport()
  syncSidebar()
  initSidebarSections()
  initInteractions()
  initScrollToTop()
  initMobileSidebarDrag()
  requestAnimationFrame(() => initActiveSection())
  await loadData()
  if (fullData) {
    const hash = location.hash.slice(1)
    if (!currentCategoryId) {
      currentCategoryId = hash ? (idToTopLevel[hash] || hash) : (fullData[0]?.id || null)
    }
    const firstBuiltId = fullData.find((s: any) => countLinksSafe(s) > 0)?.id || fullData[0]?.id
    if (currentCategoryId && currentCategoryId !== firstBuiltId) {
      // Ensure requested category is built and active before rendering cards
      ensureCategorySection(currentCategoryId, fullData)
    }
    if (currentCategoryId) {
      showCategory(currentCategoryId, hash && idToTopLevel[hash] === currentCategoryId && hash !== currentCategoryId ? hash : undefined)
    }
    // Render active now; others will be built/rendered on demand when navigated
    renderBrowseCards(fullData, currentCategoryId)
  }
}

init()
