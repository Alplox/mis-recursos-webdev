# AGENTS.md — Mis Recursos WEB DEV

> Documento autoevolutivo para asistentes IA.  
> **Regla fundamental:** Si modificas la estructura del proyecto, los componentes, o el flujo de datos, actualiza este documento.

---

## 📋 Stack

| Área | Tecnología | Versión |
|---|---|---|
| Framework | Astro | ^5.7 |
| Lenguaje | TypeScript / JavaScript (ESM) |
| CSS | Vanilla CSS con variables (modo oscuro/claro) |
| Build | `npm run build` → `/dist` |
| Package manager | npm |
| Node.js requerido | ^22 |

## 🏗️ Estructura del proyecto

```
mis-recursos-webdev/
├── src/
│   ├── pages/
│   │   └── index.astro            # Página principal (única ruta)
│   ├── components/
│   │   ├── Sidebar.astro           # Sidebar de navegación
│   │   ├── SidebarSection.astro    # Sección colapsable del sidebar
│   │   ├── LinkGrid.astro          # Grid de links (vacio, JS renderiza cards)
│   │   ├── SearchBar.astro         # Barra de búsqueda + header actions
│   │   ├── ThemeToggle.astro       # Cambio dark/light mode
│   │   ├── BookmarkExport.astro    # Exportar a bookmarks.html
│   │   └── ContributeButton.astro  # Botón "Añadir recurso"
│   ├── layouts/
│   │   └── BaseLayout.astro        # Layout base (head, scripts globales, SVG sprite)
│   ├── lib/
│   │   └── search.js               # Lógica de búsqueda/flatten
│   ├── scripts/
│   │   ├── client.ts               # 🧠 TODO el JS cliente (sidebar, search, preview, tooltip, IntersectionObserver)
│   │   └── render-cards.ts         # createCard() + renderBrowseCards() progresivo
│   ├── styles/
│   │   └── global.css              # CSS global con variables de tema
│   └── data/
│       └── recursos.json           # ⚙️ Auto-generado desde README.md (gitignored)
├── public/
│   └── data/
│       └── recursos.json           # Copia del JSON (generada en build, gitignored)
├── scripts/
│   ├── parse-readme.mjs            # Parser compartido (slugify, parse, countLinks)
│   ├── readme-to-json.mjs          # README.md → recursos.json (prebuild)
│   └── validate-links.mjs          # Valida links duplicados
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── nuevo-recurso.md
│   │   ├── sugerir-cambio.md
│   │   └── reportar-enlace.md
├── astro.config.mjs
├── package.json
├── AGENTS.md                       # ← Este archivo
└── README.md                       # 🗂️ FUENTE DE VERDAD — editar aquí
```

## 🧠 Source of Truth

**`README.md`** es la única fuente de verdad.

El JSON en `src/data/recursos.json` se genera automáticamente desde el README en cada build via `scripts/readme-to-json.mjs`. Nunca editar JSON manualmente.

### Estructura del README

El README usa el formato:
```markdown
## Nombre de sección

- <https://ejemplo.com>
- <https://ejemplo.com> (Descripción opcional)
```

Los headings `##` / `###` / `####` / `#####` definen la jerarquía de secciones. Los links en formato `- <url>` o `- <url> (desc)` se convierten a objetos con `name` (la URL) y `description` opcional.

## 🏗️ Arquitectura de renderizado

### Híbrido server-side + client-side

El proyecto usa un enfoque **híbrido**:

1. **Server-side (Astro)**: Renderiza el esqueleto: sidebar, headers de sección, contenedores vacíos de grids con `data-section-id`. HTML final: **~70 KB**.
2. **Client-side (JS)**: 
   - `loadData()` fetchea `recursos.json` desde `/data/recursos.json`
   - `renderBrowseCards()` recorre el árbol de secciones y rellena los `<div class="link-grid" data-section-id="...">` vacíos
   - Los primeros 3 grids se renderizan sincrónicamente
   - El resto se renderiza progresivamente, un grid por frame vía `requestAnimationFrame`
3. **Búsqueda**: Usa `flattenData()` + `searchLinks()` sobre el JSON en memoria. No toca el DOM de browse.

Este enfoque reduce el HTML inicial de **5.5 MB → 70 KB** (98.7% menos).

## 🎨 Convenciones de código

### CSS
- Variables globales en `:root` para tema oscuro (`[data-theme="dark"]`) y claro (`[data-theme="light"]`)
- `var(--bg)`, `var(--text)`, `var(--accent)`, etc. para colores
- `var(--radius)`, `var(--transition)`, `var(--shadow)` para espaciado consistente
- No usar librerías CSS externas
- **NUNCA usar `transition: all`** — siempre propiedades específicas
- Sombras teñidas al hue del fondo (`rgba(bg-r, bg-g, bg-b, a)`) en vez de `rgba(0,0,0,a)`
- **`content-visibility: auto`** en `.categories-section` para diferir render de secciones fuera del viewport
- **`contain-intrinsic-size`** en secciones virtualizadas para layout estable

### Diseño
- **Fuente**: Onest (Google Fonts), cargada en BaseLayout.astro
- **Accent color**: Warm amber/gold (`#CD9E4B` oscuro, `#A87D2E` claro)
- **Textura**: Noise/grain sutil (`body::after` con SVG `feTurbulence`, opacidad 0.015)
- **Jerarquía tipográfica**: h2=1.35rem, h3=1.15rem, h4=0.95rem, con `text-wrap: balance`
- **Badges numéricos**: `font-variant-numeric: tabular-nums` para anchos consistentes
- **Font-smoothing**: `-webkit-font-smoothing: antialiased` en body
- **Todas las transiciones**: `200ms cubic-bezier(0.4, 0, 0.2, 1)` usando `var(--transition)`
- **Active states**: `scale(0.96)` en cards, `scale(0.92)` en botones acción, `scale(0.95)` en chips
- **Concentric border-radius**: card 8px → favicon 5px
- **Sidebar glass**: `backdrop-filter: blur(16px)` + `box-shadow: inset 0 1px 0 rgba(255,255,255,0.06)` + gradiente sutil
- **Toast**: SVG checkmark inline

### SVG Sprite Sheet
- Todos los iconos reutilizables están en un `<svg>` oculto en `BaseLayout.astro` con `<defs><symbol>`
- Prefijo `icon-` para iconos de acción
- Uso: `<svg fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-copy"/></svg>`
- NO usar SVGs inline duplicados — siempre ir al sprite
- Iconos disponibles: icon-copy, icon-preview, icon-open, icon-edit, icon-hamburger, icon-search, icon-moon, icon-sun, icon-check

### Rendimiento
- `content-visibility: auto` en secciones (render deferred)
- SVG sprite sheet reduce HTML
- `transition` nunca usa `all` (propiedades específicas)
- `keydown` handlers fusionados en un solo listener
- Google Fonts: `media="print" onload="this.media='all'"` para carga no bloqueante
- `compressHTML: true` en build config (nativo de Astro)
- `animation: card-in` solo en tarjetas creadas por search (clase `.animate-in`), no en tarjetas estáticas
- `renderBrowseCards()` renderiza progresivamente con `requestAnimationFrame` (1 grid por frame)

### Componentes Astro
- Componentes sin estado (solo renderizado estático)
- La interactividad se añade con `<script>` tags dentro del componente
- Props tipadas con interfaces de TypeScript en el frontmatter

### JavaScript client-side
- Funciones globales expuestas en `window.__*` (ej: `__search`, `__toggleSidebar`, `__copyLink`, `__showToast`)
- Módulos ES importados desde `src/lib/` y `src/scripts/`
- Datos cargados vía `fetch('/data/recursos.json')` asíncrono
- Tarjetas renderizadas desde JS con `renderBrowseCards()` progresivo
- Search usa `flattenData()` + `searchLinks()` sobre JSON en memoria (no toca el DOM de browse)

## 🔄 Flujo de contribución (usuarios)

1. **Añadir recurso**: Botón "Añadir" → GitHub Issue con template `nuevo-recurso.md`
2. **Sugerir cambio**: Botón "✏️" en cada tarjeta → GitHub Issue con template `sugerir-cambio.md`
3. **Reportar caído**: Botón "🚫" → GitHub Issue con template `reportar-enlace.md`

El mantenedor revisa los issues y actualiza `README.md` manualmente.

## 🚀 Comandos

```bash
npm run dev          # Servidor de desarrollo
npm run build        # readme-to-json + astro build → /dist
npm run preview      # Previsualizar build local
```

## 📦 Deployment

- **Plataforma**: Cloudflare Pages
- **URL**: `https://mis-recursos-webdev.pages.dev/`
- **Build output**: `dist/`
- **Build command**: `npm run build`
- **Base config**: `astro.config.mjs` → `base: '/'`

## 🔧 Flujo de edición de datos

1. Editar `README.md` con links en formato `- <url>` o `- <url> (descripción)`
2. `npm run build` genera automáticamente `src/data/recursos.json` y `public/data/recursos.json`
3. El sitio Astro consume el JSON generado

No editar archivos JSON manualmente. El README es la única fuente de verdad.

---

## 📝 Auto-evolución

**Si estás leyendo esto como IA y vas a hacer cambios:**

1. Actualiza este documento **antes o después** de tus cambios
2. Si el cambio es estructural, actualiza la sección "Estructura del proyecto"
3. Si el cambio es de stack, actualiza "Stack" y "Comandos"

**Instrucciones para la próxima IA que trabaje aquí:**
- La fuente de verdad es `README.md` — no editar `src/data/recursos.json` manualmente
- El diseño usa variables CSS; cualquier nuevo color debe definirse en `:root` y `[data-theme="light"]`
- Los componentes Astro no deben tener estado; la interactividad va en `<script>` dentro del mismo archivo
- No añadas dependencias externas sin evaluar su impacto en el bundle size
- La app es 100% estática — no hay backend, no hay API calls (excepto favicons de Google)
- El sidebar se renderiza desde el JSON en build time — no necesita JS para funcionar
- Los iconos son SVG inline — no uses librerías de iconos
