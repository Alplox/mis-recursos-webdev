import { flattenData, searchLinks } from '../lib/search'
import { createCard, renderBrowseCards, escapeHtml } from './render-cards'

declare global {
  interface Window {
    __toggleSidebar: () => void
    __showToast: (msg: string, type?: string) => void
    __goToSection: (id: string) => void
    __toggleTheme: () => string
    __copyLink: (url: string) => Promise<void>
    __search: (query: string) => void
    __recursosData: any
  }
}

const overlay = document.getElementById('sidebar-overlay')!
const sidebar = document.getElementById('sidebar')!

function toggleSidebar(open: boolean) {
  sidebar?.classList.toggle('open', open)
  const isMobile = window.innerWidth <= 768
  if (isMobile) {
    overlay?.classList.toggle('open', open)
    document.body.style.overflow = open ? 'hidden' : ''
  } else {
    document.querySelector('.main-content')?.classList.toggle('shifted', open)
  }
}

overlay?.addEventListener('click', () => toggleSidebar(false))

window.__toggleSidebar = () => {
  const isOpen = sidebar?.classList.contains('open')
  toggleSidebar(!isOpen)
}

window.__showToast = (msg: string, type = 'success') => {
  const toast = document.getElementById('toast')
  const toastMsg = document.getElementById('toast-msg')
  if (!toast || !toastMsg) return
  toastMsg.textContent = msg
  toast.className = 'toast ' + type + ' show'
  clearTimeout((toast as any)._timer)
  ;(toast as any)._timer = setTimeout(() => toast.classList.remove('show'), 2500)
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

      const id = (toggle as HTMLElement).dataset.sectionId
      if (id) window.__goToSection(id)

      if (window.innerWidth <= 768) {
        sidebar?.classList.remove('open')
        overlay?.classList.remove('open')
        document.body.style.overflow = ''
      }
    })
  })
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
  const data = (window as any).__recursosData
  if (!data) return
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
  window.__showToast('Bookmarks exportados!')
})

window.__copyLink = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    window.__showToast('URL copiada!')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = url
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    window.__showToast('URL copiada!')
  }
}

// --- Data loading ---
let fullData: any = null
let flat: any[] = []
let sectionLookup: Record<string, string> = {}

function buildSectionLookup(sections: any[], parentPath = '') {
  for (const s of sections) {
    const path = parentPath ? `${parentPath} › ${s.name}` : s.name
    sectionLookup[path] = s.id
    buildSectionLookup(s.children, path)
  }
}

async function loadData() {
  try {
    const res = await fetch('/mis-recursos-webdev/data/recursos.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    fullData = await res.json()
    flat = flattenData(fullData)
    sectionLookup = {}
    buildSectionLookup(fullData)
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
window.__search = (query: string) => {
  if (!fullData) return
  const browse = document.getElementById('browse-content')!
  const searchResults = document.getElementById('search-results')!
  const searchHeader = document.getElementById('search-header')!
  const searchContent = document.getElementById('search-results-content')!
  const emptyState = document.getElementById('empty-state')!
  const emptyQuery = document.getElementById('empty-query')!

  if (!query || query.trim().length === 0) {
    browse.style.display = ''
    searchResults.style.display = 'none'
    emptyState.style.display = 'none'
    return
  }

  const { results, grouped, total } = searchLinks(flat, query)

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
    searchHeader.textContent = `${total} resultado${total !== 1 ? 's' : ''} para "${query}"`
  }

  if (searchContent) {
    searchContent.innerHTML = ''
    if (grouped && grouped.length > 0) {
      for (const group of grouped) {
        const section = document.createElement('section')
        section.className = 'categories-section'

        const header = document.createElement('div')
        header.className = 'category-header'
        const segs = group.name.split(' › ')
        let acc = ''
        const pathHtml = segs.map((seg: string) => {
          acc = acc ? `${acc} › ${seg}` : seg
          const id = sectionLookup[acc] || ''
          return `<button type="button" class="path-segment" onclick="__goToSection('${id}')">${escapeHtml(seg)}</button>`
        }).join('<span class="path-sep"> › </span>')
        header.innerHTML = `<h2>${pathHtml}</h2><span class="count-badge">${group.links.length}</span>`
        section.appendChild(header)

        const subheader = document.createElement('div')
        subheader.className = 'subcategory-header'
        subheader.innerHTML = `<h3>Resultados <span class="count">${group.links.length}</span></h3>`
        section.appendChild(subheader)

        const grid = document.createElement('div')
        grid.className = 'link-grid'

        for (const link of group.links) {
          const card = createCard(link)
          grid.appendChild(card)
        }

        section.appendChild(grid)
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

window.__goToSection = (id: string) => {
  if (!id) return
  clearTimeout(debounceTimer)
  if (searchInput) searchInput.value = ''
  clearBtn?.classList.remove('visible')
  const browse = document.getElementById('browse-content')!
  const searchResults = document.getElementById('search-results')!
  const emptyState = document.getElementById('empty-state')!
  browse.style.display = ''
  searchResults.style.display = 'none'
  emptyState.style.display = 'none'
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  document.querySelectorAll('.sidebar-section-toggle.active').forEach(t => t.classList.remove('active'))
  document.querySelector(`.sidebar-section-toggle[data-section-id="${id}"]`)?.classList.add('active')
}

document.addEventListener('keydown', (e) => {
  if (e.key === '/') {
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault()
      searchInput?.focus()
    }
  }
})

// --- Sidebar section filter ---
function expandParents(section: Element) {
  let parent = section.parentElement?.closest('.sidebar-section')
  while (parent) {
    const children = parent.querySelector(':scope > .sidebar-children')
    const arrow = parent.querySelector(':scope > .sidebar-section-toggle .arrow')
    if (children && !children.classList.contains('open')) {
      children.classList.add('open')
      arrow?.classList.add('open')
      try { sessionStorage.setItem('sidebar-' + (parent as HTMLElement).dataset.sectionId, 'open') } catch {}
    }
    parent = parent.parentElement?.closest('.sidebar-section')
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
  const allEls = document.querySelectorAll<HTMLElement>('.category-header[id], .section-anchor[id]')
  const targets = [...allEls].filter(el => el.classList.contains('category-header') || !el.id.endsWith('-links'))
  if (targets.length === 0) return

  function update() {
    const headerOffset = 80
    let activeId: string | null = null

    for (const target of targets) {
      const rect = target.getBoundingClientRect()
      if (rect.top <= headerOffset) {
        activeId = target.id
      } else if (activeId === null) {
        activeId = target.id
        break
      }
    }

    document.querySelectorAll('.sidebar-section-toggle.active').forEach(t => t.classList.remove('active'))

    if (activeId) {
      const toggle = document.querySelector(`.sidebar-section-toggle[data-section-id="${activeId}"]`) as HTMLElement | null
      toggle?.classList.add('active')
    }
  }

  update()
  let ticking = false
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { update(); ticking = false })
      ticking = true
    }
  }, { passive: true })
}

function handleHash() {
  const id = location.hash.slice(1)
  if (id) __goToSection(id)
}

window.addEventListener('hashchange', handleHash)

// --- Init ---
async function init() {
  if (window.innerWidth > 768) {
    sidebar?.classList.add('open')
    document.querySelector('.main-content')?.classList.add('shifted')
  }
  initSidebarSections()
  initActiveSection()
  await loadData()
  if (fullData) {
    renderBrowseCards(fullData)
  }
  handleHash()
}

init()
