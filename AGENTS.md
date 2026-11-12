# AGENTS.md — Mis Recursos WEB DEV

> Documento autoevolutivo para asistentes IA.  
> **Regla fundamental:** Si modificas la estructura del proyecto, los componentes, o el flujo de datos, actualiza este documento.

---

## 📋 Stack

| Área              | Tecnología                                    | Versión |
| ----------------- | --------------------------------------------- | ------- |
| Framework         | Astro                                         | ^7.0    |
| Lenguaje          | TypeScript / JavaScript (ESM)                 |
| CSS               | Vanilla CSS con variables (modo oscuro/claro) |
| Critical CSS      | astro-critters (inline automático)            |
| Minificación      | @playform/compress (CSS/HTML/JS/JSON)         |
| Build             | `pnpm build` → `/dist`                     |
| Package manager   | npm                                           |
| Node.js requerido | ^22                                           |

## 🏗️ Estructura del proyecto

```
mis-recursos-webdev/
├── src/
│   ├── pages/
│   │   └── index.astro            # Página principal (única ruta)
│   ├── components/
│   │   ├── Sidebar.astro           # Sidebar/TOC de navegación (desktop lateral, móvil bottom sheet)
│   │   ├── SidebarSection.astro    # Sección colapsable del sidebar
│   │   ├── LinkGrid.astro          # Grid de links (vacio, JS renderiza cards)
│   │   ├── SearchBar.astro         # Header/navbar con toggle de sidebar, búsqueda centrada y acciones (bookmarks/tema)
│   │   ├── BottomNav.astro         # Barra de navegación inferior fija en móvil (Índice, Buscar, Arriba)
│   │   ├── ThemeToggle.astro       # Cambio dark/light mode
│   │   ├── BookmarkExport.astro    # Exportar a bookmarks.html
│   │   └── ContributeButton.astro  # Botón "Añadir recurso"
│   ├── layouts/
│   │   └── BaseLayout.astro        # Layout base (head, scripts globales, SVG sprite)
│   ├── lib/
│   │   └── search.js               # Lógica de búsqueda/flatten
│   │   └── linkItem.ts             # Marcado compartido de filas de enlaces (SSR + cliente)
│   ├── scripts/
│   │   ├── client.ts               # 🧠 TODO el JS cliente (sidebar, search, preview, tooltip, IntersectionObserver)
│   │   └── render-cards.ts         # createCard() + renderBrowseCards() progresivo
│   ├── styles/
│   │   └── global.css              # CSS global con variables de tema
│   └── data/
│       └── recursos.json           # ⚙️ Auto-generado desde README.md (gitignored)
├── public/
│   ├── _headers                # Security headers (Cloudflare Pages)
│   ├── .well-known/
│   │   └── ai-catalog.json     # Catálogo ARD para agentes IA
│   ├── fonts/
│   │   ├── onest-latin.woff2
│   │   └── onest-latin-ext.woff2
│   ├── data/
│   │   └── recursos.json       # Copia del JSON (generada en build, gitignored)
│   ├── llms.txt
│   └── theme.js
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

1. **Server-side (Astro)**: Renderiza el esqueleto: sidebar, headers de sección y listas con placeholders skeleton (`.link-skeleton`) según el número de enlaces de cada subnivel para reservar espacio y evitar layout shift antes de cargar datos. HTML final: **~70 KB**.
2. **Client-side (JS)**:
   - `loadData()` fetchea `recursos.json` desde `/data/recursos.json`
   - `renderBrowseCards()` recorre el árbol de secciones y rellena los `<ul class="link-list" data-section-id="...">` vacíos
   - Prioriza la categoría activa: renderiza inmediatamente todos sus grids para evitar contenido vacío al hacer scroll; el resto de categorías se renderiza en segundo plano en lotes vía `requestAnimationFrame`
   - Los enlaces se renderizan en listas estándar (no cards) sin animación de entrada para reducir retraso percibido; los resultados de búsqueda mantienen una animación breve
   - **Vista por categoría**: solo una categoría de nivel superior (`.categories-section`) se muestra a la vez (`.active`). Al hacer clic en el sidebar se cambia la categoría activa y, si aplica, se hace scroll al subnivel dentro de ella.
3. **Búsqueda**: Usa `flattenData()` + `searchLinks()` sobre el JSON en memoria. No toca el DOM de browse. Al limpiar la búsqueda se vuelve a la categoría activa.

Este enfoque reduce el HTML inicial de **5.5 MB → 70 KB** (98.7% menos) y evita el scroll infinito mostrando categorías independientes.

## 🎨 Convenciones de código

### CSS

- Variables globales en `:root` para tema oscuro (`[data-theme="dark"]`) y claro (`[data-theme="light"]`)
- `var(--bg)`, `var(--text)`, `var(--accent)`, etc. para colores
- `var(--radius)`, `var(--transition)`, `var(--shadow)` para espaciado consistente
- No usar librerías CSS externas
- **NUNCA usar `transition: all`** — siempre propiedades específicas
- Sombras teñidas al hue del fondo (`rgba(bg-r, bg-g, bg-b, a)`) en vez de `rgba(0,0,0,a)`
- **`content-visibility`**: retirado de `.categories-section` (las secciones inactivas son `display:none`; en la activa causaba espacios en blanco al hacer scroll)
- **`contain-intrinsic-size`** en secciones virtualizadas para layout estable

### Diseño

- **Fuente**: Onest, autoalojada en `/fonts` (woff2, `font-display: optional` para CLS 0)
- **Accent color**: Warm amber/gold (`#CD9E4B` oscuro, `#A87D2E` claro)
- **Textura**: Noise/grain sutil (`body::after` con SVG `feTurbulence`, opacidad 0.015)
- **Jerarquía tipográfica**: h2=1.35rem, h3=1.15rem, h4=0.95rem, con `text-wrap: balance`
- **Badges numéricos**: `font-variant-numeric: tabular-nums` para anchos consistentes
- **Font-smoothing**: `-webkit-font-smoothing: antialiased` en body
- **Todas las transiciones**: `200ms cubic-bezier(0.4, 0, 0.2, 1)` usando `var(--transition)`
- **Active states**: `scale(0.96)` en cards, `scale(0.92)` en botones acción, `scale(0.95)` en chips
- **Listado de enlaces**: formato lista estándar (no cards) para permitir selección de texto, ver descripciones completas y aprovechar mejor el ancho (`.link-list` / `.link-item`), con placeholders skeleton SSR por cantidad de enlaces para reservar espacio y evitar saltos de layout antes de hidratar datos
- **Sidebar / TOC**: navegación lateral estilo TOC con línea vertical guía unificada por nivel (`.sidebar-children::before`), indentación según nivel de encabezado (`--toc-level` en subniveles), y marcado claro de la sección activa/cargada (expansión de ancestros y scroll del item activo al navegar)
- **Móvil**: en `<=768px` el TOC se muestra como *bottom sheet* (panel deslizante desde abajo, no pantalla completa) y se accede desde la barra inferior fija (`BottomNav`: Índice, Buscar). El hamburguesa superior se oculta en móvil; el contenido reserva espacio inferior para no quedar bajo la barra.
- **Altura de la barra inferior centralizada**: `--bottom-nav-height` (60px, 52px en landscape) + `--safe-bottom` (`env(safe-area-inset-bottom)`) = `--bottom-nav-total`. La barra, el drawer (`bottom`, `transform` de cerrado), el overlay, el padding del contenido y el scroll-to-top usan siempre `--bottom-nav-total`, para que el drawer quede pegado a la barra en cualquier navegador con safe areas (Firefox/iOS) y orientación.
- **Landscape móvil**: el bottom sheet ocupa todo el alto disponible sobre la barra (`calc(100dvh - var(--bottom-nav-total))`) y compacta header/búsqueda/footer; el TOC hace scroll (`min-height: 0` en `.sidebar-content`). En portrait mide `min(70dvh, 600px)`.
- **Viewport**: `<meta viewport>` incluye `viewport-fit=cover` para que `env(safe-area-inset-*)` funcione en pantallas con notch.
- **Sidebar glass**: `backdrop-filter: blur(16px)` + `box-shadow: inset 0 1px 0 rgba(255,255,255,0.06)` + gradiente sutil (en móvil se usa fondo sólido para rendimiento)
- **Feedback de acciones**: sin toast global; copiar/exportar muestran resultado (éxito/error) in situ mediante morph de icono y actualización de `aria-label` para accesibilidad

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
- `astro-critters` inlinea CSS crítico (71% del CSS inyectado en HTML)
- `@playform/compress` minifica CSS/HTML/JS/JSON en build
- `compressHTML: true` en build config (nativo de Astro)
- `animation: item-in` breve solo en ítems de resultados de búsqueda (clase `.animate-in`); los ítems de navegación se renderizan sin animación de entrada para evitar retraso percibido
- `renderBrowseCards()` renderiza progresivamente con `requestAnimationFrame` (1 grid por frame)
- search.js se carga con dynamic import solo cuando el usuario busca por primera vez

### Componentes Astro

- Componentes sin estado (solo renderizado estático)
- La interactividad se añade con `<script>` tags dentro del componente
- Props tipadas con interfaces de TypeScript en el frontmatter

### JavaScript client-side

- Funciones globales expuestas en `window.__*` (ej: `__search`, `__toggleSidebar`, `__copyLink`, `__goToSection`)
- Módulos ES importados desde `src/lib/` y `src/scripts/`
- Datos cargados vía `fetch('/data/recursos.json')` asíncrono
- Tarjetas renderizadas desde JS con `renderBrowseCards()` progresivo
- Navegación por categorías independientes: `idToTopLevel` mapea cualquier id a su categoría raíz, `showCategory()` alterna la `.categories-section.active`, `__goToSection()` cambia de categoría y hace scroll a subniveles
- En móvil el índice (sidebar/TOC) funciona como *bottom sheet*: se abre/cierra con `__toggleSidebar()` (botón Índice), se cierra al navegar a una sección (`__goToSection`/click en TOC), con `Escape` y al tocar el overlay; la barra inferior también ofrece acceso rápido a buscar y volver arriba.
- **Arrastre del sheet**: solo el header actúa como handle (los toques dentro de `.sidebar-content` hacen scroll del TOC, no arrastran). El gesto desde la barra inferior también abre el sheet (los handlers de movimiento/fin se registran también en `.bottom-nav`, porque el touch sigue apuntando a la barra). El transform de abierto/cerrado lo define el CSS; el JS solo pone transforms inline durante el arrastre y los limpia al soltar.
- **Búsqueda en header**: la barra de búsqueda vive dentro del navbar/header (centrada en escritorio) y permanece visible para editar/consultar sin overlays. El atajo `/`, `__toggleSearch()` y el botón “Buscar” de la barra inferior enfocan el input; los resultados se renderizan en el contenido principal como antes.
- **`search.js`** se carga con dynamic import (`import()`) solo cuando el usuario escribe en el buscador por primera vez. No está en el bundle crítico.
- `flattenData()` se ejecuta lazy en el primer search, no al cargar la página
- Search usa `flattenData()` + `searchLinks()` sobre JSON en memoria (no toca el DOM de browse)

## 🔄 Flujo de contribución (usuarios)

1. **Añadir recurso**: Botón "Añadir" → GitHub Issue con template `nuevo-recurso.md`
2. **Sugerir cambio**: Botón "✏️" en cada tarjeta → GitHub Issue con template `sugerir-cambio.md`
3. **Reportar caído**: Botón "🚫" → GitHub Issue con template `reportar-enlace.md`

El mantenedor revisa los issues y actualiza `README.md` manualmente.

## 🚀 Comandos

```bash
pnpm dev          # Servidor de desarrollo
pnpm build        # readme-to-json + astro build → /dist
pnpm preview      # Previsualizar build local
```

## 📦 Deployment

- **Plataforma**: Cloudflare Pages
- **URL**: `https://mis-recursos-webdev.pages.dev/`
- **Build output**: `dist/`
- **Build command**: `pnpm build`
- **Base config**: `astro.config.mjs` → `base: '/'`

## 🔧 Flujo de edición de datos

1. Editar `README.md` con links en formato `- <url>` o `- <url> (descripción)`
2. `pnpm build` genera automáticamente `src/data/recursos.json` y `public/data/recursos.json`
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
