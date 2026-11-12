export interface LinkLike {
  name: string
  url: string
  description?: string
}

/** Attribute/text-safe escaping shared by SSR and client rendering. */
export function escapeHtmlText(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const REPORT_BASE = 'https://github.com/Alplox/mis-recursos-webdev/issues/new?template=sugerir-cambio.md'

/** Inner markup of a `<li class="link-item">`; identical for SSR and hydration. */
export function linkItemContentHtml(link: LinkLike): string {
  const url = escapeHtmlText(link.url)
  const name = escapeHtmlText(link.name)
  const description = link.description
    ? `<span class="link-desc">${escapeHtmlText(link.description)}</span>`
    : ''
  const reportHref = `${REPORT_BASE}&title=Sugerencia: ${encodeURIComponent(link.name)}&body=URL: ${encodeURIComponent(link.url)}%0A---%0A`

  return `<div class="link-main"><a href="${url}" target="_blank" rel="noopener noreferrer" class="link-url">${name}</a>${description}</div><div class="link-actions"><button class="link-action-btn copy-btn" data-copy-url="${url}" title="Copiar URL" aria-label="Copiar URL"><span class="action-feedback-icon"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#icon-copy"/></svg></span></button><a href="${escapeHtmlText(reportHref)}" target="_blank" rel="noopener noreferrer" class="link-action-btn report-btn" title="Reportar enlace o sugerir cambio" aria-label="Reportar enlace o sugerir cambio: ${name}"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#icon-alert"/></svg></a></div>`
}

/** Full row markup, used to server-render rows that must not shift on hydration. */
export function linkItemHtml(link: LinkLike, animate = false): string {
  return `<li class="link-item${animate ? ' animate-in' : ''}">${linkItemContentHtml(link)}</li>`
}
