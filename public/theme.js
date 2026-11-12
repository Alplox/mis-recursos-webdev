;(function () {
  var STORAGE_KEY = 'recursos-theme'
  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY) } catch (e) { return null }
  }
  function getPreferred() {
    var stored = getStored()
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(STORAGE_KEY, theme) } catch (e) {}
  }
  setTheme(getPreferred())
  window.__toggleTheme = function () {
    var current = document.documentElement.getAttribute('data-theme') || 'dark'
    var next = current === 'dark' ? 'light' : 'dark'
    setTheme(next)
    return next
  }
})()
