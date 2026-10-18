# Sistema de diseño consistente para el frontend (skill interface-design)

**Estado: APROBADO por el usuario (2026-10-18).** Dirección "Libro de facturas" y todas las
recomendaciones. Ver "Decisiones" al final.

## Objetivo
Dar a todos los módulos actuales del frontend (cabecera, auth, formularios, inicio y toggle de tema)
un único lenguaje visual decidido: espaciado, radios, tipografía, profundidad, tokens y estados
comunes sobre Angular Material M3. Se corrige que `/inicio` sea plano y que la cabecera no se parezca
a la pantalla de auth. Las decisiones quedan escritas en `.interface-design/system.md`.

## Ámbito
frontend. No cambian el backend, la API, las rutas ni el comportamiento.

---

## 1. Auditoría del estado actual

### 1.1 Valores reales por fichero
| Fichero | Espaciado | Tipografía | Radios | Color / borde / sombra |
|---|---|---|---|---|
| `src/styles.scss` | `body { margin: 0 }` | `font: var(--mat-sys-body-medium)` (14px/20px, 400), pila del sistema | — | `--mat-sys-surface` / `--mat-sys-on-surface`. No hay `-webkit-font-smoothing`, `text-wrap` ni `tabular-nums` |
| `core/layout/main-layout/main-layout.scss` | `.content { padding: 1rem }` (16px). No hay `max-width`: el contenido ocupa todo el ancho | `.title { font: var(--mat-sys-title-large) }` (22px/28px, **400**) | — | `.header { border-bottom: 1px solid var(--mat-sys-outline-variant) }`. `.content` repite el `background`/`color` del `body` |
| `mat-toolbar` (valores por defecto de Material) | altura 64px en escritorio y 56px en móvil, `padding: 0 16px` | — | — | Sin sombra |
| `core/layout/auth-layout/auth-layout.scss` | `.theme-corner { position: absolute; top: 1rem; right: 1rem }`. `.auth-screen { gap: 1.5rem (24px); padding: 1rem; min-height: 100vh }` | `.brand { font-size: 1.75rem (28px); font-weight: 600 }`: **valores sueltos, no son tokens**. El `line-height` se hereda del body (20px) y queda **por debajo** del tamaño de letra (28px) | — | `:host` repite `background`/`color` del body. `100vh` (en móvil, la barra del navegador corta la pantalla) |
| `features/auth/login-form/login-form.scss` | `:host { max-width: 24rem }` (384px). `.form { gap: 1rem; padding-top: 1rem }`. `.server-error { padding: .75rem 1rem; gap: .5rem }` | `.switch` hereda body-medium | `.server-error`: `var(--mat-sys-corner-small)` (8px) | error-container / on-error-container; `.switch` on-surface-variant; enlace primary **sin estilos de hover ni focus** |
| `features/auth/register-form/register-form.scss` | **Idéntico línea a línea** a `login-form.scss` (36 líneas duplicadas) | igual | igual | igual |
| `mat-card appearance="outlined"` (valores por defecto) | cabecera `16px 16px 0`, contenido `0 16px` y 16px abajo | `mat-card-title` = title-large 22px/**400**, en un `<div>`: **las páginas de auth no tienen `h1`** | `corner-medium` (12px) | borde outline-variant, sin sombra |
| `features/home/home/home.scss` | `.home { gap: 1rem }`, sin contenedor ni ancho máximo, pegado a la cabecera (16px) | `h1 { font-size: 1.5rem }` (24px, valor suelto). El peso viene del navegador (bold, 700) y el `line-height`, del body (20px), **por debajo** de los 24px de la letra | — | on-surface |
| Botones `matButton` / `matIconButton` | alto 40px; el de icono tiene 40px visibles y 48px de área táctil | label-large 14px/500 | **`corner-full` (píldora)** | spinner de 18px en carga |
| `mat-form-field` outline | alto 56px; `subscriptSizing: 'dynamic'` | body-large 16px | `corner-extra-small` (4px) | borde `outline` |
| `shared/theme-toggle` | no tiene SCSS | — | círculo | Por defecto de Material |

### 1.2 Inconsistencias concretas
1. **La marca "Facturas" se pinta de dos formas**: en `main-layout.scss` usa `title-large` (22px, 400, token) y en `auth-layout.scss` usa 1.75rem/600 a mano. No comparten ni tamaño ni peso ni origen.
2. **La cabecera solo existe en una de las dos pantallas**: `MainLayout` tiene toolbar con borde y `AuthLayout` no tiene barra. El toggle de tema está en el extremo de la toolbar (centrado a 32px del borde superior) o en `position: absolute` a 16px de la esquina (unos 36px), así que salta de sitio al iniciar sesión. Además, el `absolute` es un apaño estructural que la skill desaconseja.
3. **Hay cuatro radios sin regla**: 4px (campo), 8px (alerta), 12px (tarjeta) y píldora (botón).
4. **Los pasos de espaciado son arbitrarios**: 0.5, 0.75, 1, 1.5 y 1.75rem, en rem, sin escala declarada. Hay padding asimétrico como apaño: `.form { padding-top: 1rem }` compensa la cabecera de la tarjeta.
5. **No hay escala tipográfica**: hay tamaños sueltos (1.5rem, 1.75rem) junto a tokens M3, y el peso de los títulos se deja al navegador o a M3 (400). La jerarquía solo usa el tamaño.
6. **La pantalla de auth tiene 384px de ancho y la principal no tiene ancho máximo**: no hay una columna común.
7. **`login-form.scss` y `register-form.scss` están duplicados.** También lo está el bloque `.server-error` en las dos plantillas.
8. `background`/`color` se declaran tres veces (body, `.content` y `:host` de auth).
9. **Semántica**: en las pantallas de auth no hay `h1`, y `mat-toolbar` no está dentro de un landmark `<header>`.
10. **Al margen del diseño, sin tocar en este plan**: `Home`, `AuthLayout`, `LoginForm`, `RegisterForm`, `Login` y `Register` no declaran `ChangeDetectionStrategy.OnPush`, mientras que `MainLayout`, `ThemeToggle` y `App` sí. Se resuelve en un cambio aparte (decisión 9).

### 1.3 Estados que faltan
| Estado | Situación |
|---|---|
| hover | Los botones lo tienen (state layer de Material). Los enlaces `.switch a` usan el subrayado del navegador siempre visible y no reaccionan al hover |
| focus | Material solo pinta un state layer tenue: **no hay anillo de foco visible con teclado** en botones, toggle ni ojo. Los enlaces usan el outline del navegador |
| disabled | Correcto en los botones con carga (`disabledInteractive`). No hay más controles deshabilitados |
| loading | Correcto en los botones. **La app muestra una página en blanco** mientras `restoreSession()` resuelve en el initializer: se añade un marcador estático (decisión 7, paso 9). No hay indicador al cargar las rutas lazy (aceptable: son chunks pequeños) |
| empty | **`/inicio` no tiene estado vacío**: un `h1` y un botón sueltos |
| error | Correcto en los formularios (`mat-error` + `role="alert"`). En inicio no hace falta: el logout navega igualmente |

---

## 2. Exploración de dominio (skill)

**Intent**
- **Quién es**: una persona autónoma o una pequeña empresa en España. Abre la app entre trabajos o a final de mes para emitir una factura, ver qué le deben o preparar el trimestre para su gestoría. No es diseñador ni se dedica a la contabilidad: quiere terminar rápido y sin errores, porque una factura mal numerada o con el IVA equivocado le da problemas con Hacienda.
- **Qué tiene que hacer**: emitir, revisar y cobrar. Hoy solo puede entrar, registrarse y salir.
- **Cómo debe sentirse**: como un **talonario de facturas bien llevado**. Papel claro, tinta precisa, filetes finos, cifras alineadas. Serio y ordenado como un libro de registro, sin la frialdad de un terminal ni la alegría de un SaaS de marketing.

**Domain** (territorio, no funcionalidades)
talonario y matriz, serie y número correlativo (`2026/0001`), base imponible, IVA e IRPF (retención), NIF/CIF, trimestre (1T a 4T, modelos 303 y 130), vencimiento, cobrada / pendiente / vencida, libro registro de facturas emitidas, membrete, gestoría, sello de "PAGADO", Verifactu.

**Color world**
- Blanco roto del papel de factura y del libro de registro.
- Azul violáceo del **papel de calco** de los talonarios y de la tinta de sello: es el indigo `#6366F1` que ya tenemos.
- Gris grafito del lápiz y de los filetes impresos de las casillas.
- Rojo de sello de "VENCIDA" o "IMPAGADA" (reservado para errores y estados vencidos).
- Verde apagado de "COBRADA" (reservado para el futuro; hoy no se usa).
- Amarillo pálido de subrayador o pósit en la carpeta del trimestre (no se usa como color de interfaz).

**Signature: "la raya de total"**
Es el doble filete contable que cierra un total o un membrete (`3px double` con el token de filete: dos líneas de 1px separadas 1px). Solo existe en un mundo de facturas y libros de cuentas. Se acompaña del **margen de talonario**: una barra vertical de 3×16px en tinta de calco delante de la marca, que recuerda la perforación o el margen de la matriz.

**Defaults rechazados**
1. Barra lateral y una cuadrícula de tarjetas KPI en el inicio, con cifras inventadas → **inicio con datos reales** (saludo, fecha) y un **estado vacío honesto**, sin métricas falsas.
2. Indigo por todas partes, con degradados y fondo de color en la cabecera (el SaaS morado típico) → **indigo solo como tinta**, en un 10% como mucho: botón principal, enlaces, foco y la barra de la marca. Superficies neutras.
3. Tarjetas flotando con sombra sobre un lienzo gris, botones píldora y una marca grande y aislada en el login → **papel plano con filetes finos** (solo bordes), radios de documento (4/8px) y **el mismo membrete en las dos pantallas**.

**Direction (aprobada)**
"Libro de facturas". Una sola superficie de papel (`surface`) en las dos pantallas, con estructura de filetes finos (`outline-variant`) y la raya doble como firma bajo cada membrete o título de documento. La tinta de calco (primary) se reserva para la acción y la identidad. La tipografía es la del sistema, con jerarquía por peso y color más que por tamaño, cifras tabulares en toda la app y radios pequeños, de documento. La densidad es cómoda pero contenida: la persona usuaria entra de vez en cuando, no está ocho horas al día.

### Before Writing Each Component (bloque obligatorio)
```
Intent:     Autónomo/pyme en España que entra a emitir y controlar sus facturas; debe sentirse
            como un talonario bien llevado: ordenado, preciso, tranquilo.
Hierarchy:  Una sola acción o título focal por vista. En auth gana el título de la tarjeta
            (28px/600) y el botón principal (filled, tinta de calco). En inicio gana el saludo
            (28px/600) y lo demás baja a 14px secundario. La marca se rebaja a 16px/600.
Palette:    Papel (surface), tinta (on-surface), tinta suave (on-surface-variant), filete
            (outline-variant), tinta de calco (primary) para acción e identidad y sello rojo (error)
            solo para errores. Sale del talonario: papel, calco y sello.
Depth:      Solo bordes. Filetes de 1px en outline-variant, raya doble como firma y ninguna
            sombra. Un documento impreso no flota, y en oscuro las sombras no se leen.
Surfaces:   Una sola superficie (surface) para lienzo, cabecera y tarjetas. Las capas
            superpuestas (menús, diálogos) usan surface-container, que pone Material. Los campos
            se definen por su borde outline, no por un relleno. Tono neutro de la paleta generada,
            ligeramente violáceo, coherente con el calco.
Typography: Pila del sistema. Ratio ~1.25 desde 14px, ajustado a la escala M3 (11·12·14·16·22·28).
            Jerarquía por tres palancas: tamaño, peso (400/500/600) y color (4 niveles de tinta).
            Tracking -0.01em en títulos y tabular-nums global, porque es una app de cifras.
Spacing:    Base 4px; escala 4·8·12·16·24·32·48·64. Densidad "cómoda contenida": 24px de
            padding en las tarjetas, 16px entre campos, 32px entre bloques de página, 24px de
            margen lateral (16px en móvil).
```

---

## 3. Sistema de diseño concreto

Todo se declara en `src/styles.scss`, dentro de `html { … }` y después de `mat.theme()`, para poder
referenciar `--mat-sys-*`. Los nombres van en inglés (código en inglés) y evocan el dominio. **No hay
ningún hex**: todo color sale de `--mat-sys-*`.

### 3.1 Color: tokens semánticos del dominio
| Token | Valor | Uso |
|---|---|---|
| `--paper` | `var(--mat-sys-surface)` | lienzo, cabecera y tarjetas |
| `--ink` | `var(--mat-sys-on-surface)` | texto de nivel 1 (principal) |
| `--ink-soft` | `var(--mat-sys-on-surface-variant)` | texto de nivel 2 (de apoyo) |
| `--ink-faint` | `color-mix(in srgb, var(--mat-sys-on-surface-variant) 80%, var(--mat-sys-surface))` | texto de nivel 3 (metadatos: fecha, pies). Debe dar un contraste ≥ 4.5:1 en los dos modos (paso 1) |
| `--ink-ghost` | `color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent)` | texto de nivel 4 (deshabilitado; 38% es la opacidad de deshabilitado de M3) |
| `--rule` | `var(--mat-sys-outline-variant)` | filetes, bordes de tarjeta y separadores |
| `--rule-total` | `3px double var(--rule)` | **firma**: raya doble bajo el membrete y los títulos de documento |
| `--carbon` | `var(--mat-sys-primary)` | tinta de calco: acción principal, enlaces, foco y barra de la marca (decisión 1) |
| `--stamp` | `var(--mat-sys-error)` | sello rojo: solo errores (el contenedor de alerta usa error-container) |

Jerarquía de texto en 4 niveles: `--ink` → `--ink-soft` → `--ink-faint` → `--ink-ghost`.

### 3.2 Espaciado
- Base **4px**. Escala: `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`,
  `--space-6: 24px`, `--space-8: 32px`, `--space-12: 48px`, `--space-16: 64px`.
- Contextos: micro de 4 a 8px (icono-texto, alerta), componente de 12 a 16px (entre campos, dentro de los
  controles), sección de 24 a 32px (padding de tarjeta, bloques de página) y mayor de 48 a 64px (entre áreas).
- Maquetación: `--gutter: 24px` (16px por debajo de 600px), `--page-max: 1120px` (columna común de
  cabecera y contenido), `--sheet-narrow: 400px` (columna de auth) y `--bar-height: 56px` (cabecera en
  todos los tamaños).
- Padding simétrico. Fuera los apaños como `padding-top` para compensar.
- Densidad de Material: `0` en toda la app (decisión 3).

### 3.3 Radios
Radios de documento: el papel tiene esquinas casi rectas.
- `--radius-control: var(--mat-sys-corner-extra-small)` (4px): campos, botones de texto (decisión 8) y alerta.
- `--radius-sheet: var(--mat-sys-corner-small)` (8px): tarjetas y bloques de estado vacío.
- `--radius-overlay: var(--mat-sys-corner-medium)` (12px): menús y diálogos (en el futuro).
- Excepción documentada: los `matIconButton` (toggle y ojo) siguen siendo círculos.

### 3.4 Profundidad (una sola estrategia)
**Solo bordes.** Filetes de 1px en `--rule`, la `--rule-total` como firma y **ningún `box-shadow` propio**.
Las tarjetas son `appearance="outlined"` y la toolbar no tiene elevación. Material puede poner sus propias
sombras en overlays futuros (menús), y se aceptan como capa superpuesta.

### 3.5 Tipografía
Pila del sistema, sin cambios (decisión 2). Ratio **~1.25** (tercera mayor) desde 14px, redondeado a la
escala M3:

| Rol | Token M3 de base | Tamaño / interlineado | Peso | Tracking | Color |
|---|---|---|---|---|---|
| Título de página (`h1`) | headline-medium | 28 / 36 | 600 | -0.01em | `--ink` |
| Sección (`h2`) | title-large | 22 / 28 | 600 | -0.005em | `--ink` |
| Subtítulo / marca | title-medium | 16 / 24 | 600 | 0 | `--ink` |
| Cuerpo | body-medium | 14 / 20 | 400 | M3 | `--ink` / `--ink-soft` |
| Metadato | label-medium | 12 / 16 | 500 | M3 | `--ink-faint` |
| Caption | label-small | 11 / 16 | 500 | M3 | `--ink-faint` |

- Tokens compuestos propios a partir de las piezas de M3, sin tamaños sueltos. Por ejemplo,
  `--type-page-title: 600 var(--mat-sys-headline-medium-size) / var(--mat-sys-headline-medium-line-height) var(--mat-sys-headline-medium-font);`.
  Lo mismo para `--type-section`, `--type-subtitle`, `--type-body`, `--type-meta` y `--type-caption`.
- `mat.theme` → `typography: (…, bold-weight: 600, medium-weight: 500, regular-weight: 400)`.
- Globales: `-webkit-font-smoothing: antialiased`, `font-variant-numeric: tabular-nums` en `body`
  (las cifras de una app de facturación tienen que alinearse), `text-wrap: balance` en `h1`–`h3` y
  `text-wrap: pretty` en `p`. `h1`–`h3` con `margin: 0` (el ritmo lo pone el `gap` del contenedor).

### 3.6 Personalización de Material con `mat.<componente>-overrides()`
Van en `styles.scss` (nunca en el SCSS de un componente) y se aplican a todos los componentes.
**Los nombres exactos de los tokens se comprueban en la pestaña "Styling" de cada componente en
material.angular.dev**: el mixin falla en la build si una clave no existe, y eso sirve de verificación.
- `mat.toolbar-overrides((container-background-color: var(--paper), container-text-color: var(--ink), standard-height: 56px, mobile-height: 56px))`
- `mat.card-overrides((outlined-container-color: var(--paper), outlined-outline-color: var(--rule), outlined-container-shape: var(--radius-sheet), title-text-weight: 600, title-text-size: var(--mat-sys-headline-medium-size), title-text-line-height: var(--mat-sys-headline-medium-line-height), title-text-tracking: -0.01em))`
- `mat.button-overrides((filled-container-shape: var(--radius-control), tonal-container-shape: var(--radius-control), outlined-container-shape: var(--radius-control), text-container-shape: var(--radius-control)))` (decisión 8). `icon-button` no se toca (sigue circular).
- `mat.form-field`: sin overrides. El borde `outline` por defecto da el contraste de 3:1 que pide WCAG
  1.4.11 y su radio ya es de 4px (`--radius-control`).
- **Foco visible**: `@include mat.strong-focus-indicators((border-style: solid, border-width: 2px))` y,
  si la API M3 lo pide, color `var(--carbon)`. Hay que consultar la guía de accesibilidad de
  material.angular.dev para la API exacta con `mat.theme`.

### 3.7 Modo claro y oscuro
Todos los tokens propios se apoyan en `--mat-sys-*`, que ya emiten `light-dark()`, así que **no hay
reglas por modo**. La `--rule-total` y `--ink-faint` se revisan a ojo en oscuro (paso 11). **El cambio de
tema no se anima**: los componentes de Material cambian al instante, y si se animara el `body`
quedarían mitades desacompasadas.

### 3.8 Movimiento
- Solo la entrada de página: `@keyframes page-enter { from { opacity: 0; transform: translateY(4px); } }`
  con `200ms cubic-bezier(0.23, 1, 0.32, 1)`. Tokens `--ease-out` y `--duration-enter`, y solo `opacity`
  y `transform`.
- `@media (prefers-reduced-motion: reduce)` redefine `page-enter` como solo `opacity` (sin desplazamiento).
- Las animaciones de Material (ripple, spinner, campos) no se tocan. Ver Riesgos.

### 3.9 Patrones de componente (medidas)
- **Membrete (top bar)**: `<header>` + `mat-toolbar` de 56px, fondo `--paper` y borde inferior
  `--rule-total`. Contenido interior centrado en `--page-max` con padding lateral `--gutter`. A la
  izquierda, la marca (barra de 3×16px en `--carbon` + "Facturas" 16/24/600, con 8px de separación). A
  la derecha, el toggle. Es el mismo en la app y en auth (decisión 6).
- **Columna de página** (`MainLayout`): `width: min(100%, var(--page-max))`, centrada, padding
  `--space-8 --gutter` (32/24; 24/16 en móvil), `display: grid` y `gap: var(--space-8)`. Sin navegación
  lateral por ahora (decisión 5).
- **Cabecera de página** (inicio): un metadato de 12px/500 en `--ink-faint` encima del `h1` (28/600),
  separados 4px. Las acciones van a la derecha con `flex-wrap` (debajo en móvil). Padding inferior de
  16px y `--rule-total` debajo.
- **Hoja de auth**: columna de `min(100%, var(--sheet-narrow))`, centrada en vertical con
  `margin-block: auto` (sin recorte en móviles bajos). Tarjeta outlined de 8px de radio con padding de
  24px. La cabecera de la tarjeta lleva `h1` y `--rule-total` debajo, con 16px de separación.
  Formulario con `gap: 16px`, botón principal a 24px del último campo y enlace secundario a 16px.
- **Alerta de formulario** (`app-form-alert`): `role="alert"`, error-container / on-error-container,
  radio de 4px, padding 12/16, separación de 8px entre el icono `error` (20px) y el texto de 14px.
- **Estado vacío**: bloque con borde de 1px en `--rule`, 8px de radio y padding de 32px. Título de
  16/600 en `--ink`, texto de 14px en `--ink-soft` con un ancho máximo de 48ch y sin CTA. Textos
  aprobados (decisión 4): título "Todavía no hay nada por aquí" y texto "Cuando haya secciones
  disponibles, aparecerán en esta página.".
- **Marcador de arranque** (`index.html`): "Facturas" centrado en la pantalla, 16/600 en `--ink-faint`,
  sin JS (decisión 7).
- **Enlaces de texto**: color `--carbon`, subrayado de 1px con `text-underline-offset: 2px`, que pasa a
  2px en hover. En `:focus-visible`, outline de 2px en `--carbon` con `outline-offset: 2px`.

---

## Criterios de aceptación
- Dado `frontend/src`, cuando se buscan colores fijos (`#[0-9a-fA-F]{3,8}\b`, `rgb(`, `rgba(`, `hsl(`)
  fuera de `src/styles/_theme-colors.scss`, entonces no hay ninguna coincidencia.
- Dado cualquier `.scss` de componente, cuando se busca un `px`/`rem` literal de espaciado, radio o tamaño
  de letra, entonces solo aparecen `var(--space-*)`, `var(--radius-*)` o `var(--type-*)`. Las únicas
  excepciones son la barra de la marca (3×16px) y los diámetros del spinner, que son atributos.
- Dado `frontend/src`, cuando se busca `box-shadow`, entonces no hay ninguna coincidencia (profundidad
  solo con bordes).
- Dado `styles.scss`, entonces define los tokens de la sección 3 y los overrides de toolbar, card y
  button con `mat.*-overrides()`. No hay selectores `.mat-mdc-*` ni `.mdc-*` en ningún SCSS.
- Dado `/login` o `/registro`, cuando se cargan, entonces se ve la misma cabecera que en `/inicio`:
  `<header>` con la marca "Facturas" a la izquierda, el toggle a la derecha, 56px de alto y la raya doble
  inferior. El toggle ocupa la misma posición en pantalla en las tres rutas (±1px a 1440px de ancho).
- Dado `/login` o `/registro`, entonces el título de la tarjeta es un `h1` ("Iniciar sesión" / "Crear
  cuenta"), con la raya doble debajo, y la página tiene un solo `h1`.
- Dado `/inicio` en escritorio (1440px), entonces el contenido está en una columna de 1120px como mucho,
  centrada y alineada a la izquierda con la marca de la cabecera (mismo borde ±1px). Encima del saludo
  se ve la fecha de hoy en español (p. ej. "Sábado, 18 de octubre de 2026"). El saludo es un `h1`
  "Hola, <firstName>" de 28px/600 y queda a 32px de la cabecera. "Cerrar sesión" se mantiene en la
  cabecera de página. Debajo está el estado vacío con el título "Todavía no hay nada por aquí" y el
  texto "Cuando haya secciones disponibles, aparecerán en esta página.", sin botones ni enlaces.
- Dado `/inicio` en móvil (390px), entonces el margen lateral es de 16px, el botón baja debajo del saludo
  y no hay scroll horizontal.
- Dado que la app arranca y `restoreSession()` aún no ha resuelto, entonces se ve "Facturas" centrado en
  lugar de una página en blanco, con el tema correcto (claro u oscuro). Cuando Angular arranca, el
  marcador desaparece.
- Dado un usuario de teclado, cuando recorre con Tab cualquier vista, entonces cada botón, enlace, ojo y
  toggle muestra un anillo de foco visible de 2px en los dos modos.
- Dado el enlace "Regístrate" / "Inicia sesión", cuando se pasa el ratón por encima, entonces el
  subrayado se engrosa; cuando recibe foco con teclado, se ve el outline.
- Dado un error del servidor en login o registro, entonces se muestra `app-form-alert` con `role="alert"`,
  el icono `error` y el mismo texto que hoy ("Email o contraseña incorrectos", "Ya existe una cuenta con
  este email").
- Dado `prefers-reduced-motion: reduce`, cuando se navega entre vistas, entonces el contenido entra solo
  con un fundido de opacidad, sin desplazarse.
- Dado el modo oscuro, entonces todos los puntos anteriores se cumplen y los textos de nivel 1 a 3 tienen
  un contraste ≥ 4.5:1 con `--paper` (comprobado en DevTools o con el script de Playwright).
- Dado `npm test`, entonces pasan todos los tests, ninguno se ha borrado ni desactivado y hay al menos
  tantos como en la línea base más los nuevos de este plan.
- Dado `npm run build`, entonces compila sin warnings de budget: initial < 1 MB y cada estilo de
  componente < 4 kB.
- Dado `frontend/package.json` y `package-lock.json`, entonces no cambian (ni siquiera `playwright-core`,
  que vive en el scratchpad).
- Las rutas, los textos actuales (salvo los nuevos de inicio y el marcador de arranque), los
  `aria-label`, los `id` de los inputs y la lógica no cambian.

## Pasos — frontend

> Al terminar cada paso: `cd frontend && npm test` en verde. `npm run build` cuando se indique.
> Componentes nuevos, siempre con `npx ng generate component …`.

0. [x] (96 tests, initial 496.81 kB; capturas "antes" de la verificación previa en Chrome) **Línea base.** Ejecutar `npm test` (anotar el número de tests) y `npm run build` (anotar el
   "Initial total" y el tamaño de los estilos de componente más grandes). Preparar el entorno de
   capturas del paso 11 (playwright-core en el scratchpad) y sacar las capturas del estado actual de
   `/login`, `/registro` e `/inicio` a 1440×900 y 390×844, en claro y en oscuro, para el PR (antes y
   después).
   Verificación: cifras y capturas guardadas en el scratchpad.

1. [x] **Tokens y base global en `src/styles.scss`.**
   - En `html`, después de `mat.theme()`: tokens de color (3.1), espaciado y maquetación (3.2), radios
     (3.3), tipografía compuesta (3.5) y movimiento (3.8, más `@keyframes page-enter` y su variante para
     `prefers-reduced-motion`).
   - En `mat.theme` → `typography`: añadir `bold-weight: 600, medium-weight: 500, regular-weight: 400`.
     La densidad se queda en `0` (decisión 3).
   - En `body`: `background: var(--paper); color: var(--ink); font: var(--type-body);`,
     `-webkit-font-smoothing: antialiased; font-variant-numeric: tabular-nums;`. En `h1, h2, h3`:
     `margin: 0; text-wrap: balance`. En `p`: `text-wrap: pretty`.
   Ficheros: `frontend/src/styles.scss`.
   Verificación: `npm run build`. En DevTools, `--ink-faint`, `--rule-total` y `--type-page-title`
   resuelven en `<html>` en los dos modos. Medir el contraste de `--ink-faint` sobre `--paper` en claro
   y en oscuro (≥ 4.5:1). Si no llega, subir el porcentaje de mezcla y anotarlo. Comprobar que
   `color-mix()` con valores `light-dark()` resuelve en Chrome, Firefox y Safari (ver Riesgos).

2. [x] **Overrides de Material y foco visible en `src/styles.scss`.**
   `mat.toolbar-overrides`, `mat.card-overrides` y `mat.button-overrides` según 3.6, y
   `mat.strong-focus-indicators`. Validar cada clave en la pestaña Styling de material.angular.dev.
   Ficheros: `frontend/src/styles.scss`.
   Verificación: `npm run build` sin errores de Sass (una clave inválida rompe la build). A ojo: botones
   con 4px de radio, tarjetas con 8px, título de tarjeta de 28/600 y anillo de foco al tabular.
   `npm test` en verde (no hay tests que dependan del estilo).

3. [x] **Membrete compartido: `core/layout/top-bar`** (decisión 6).
   Lo usan los dos layouts, así que se extrae al segundo uso real. Va en `core/layout` porque es pieza
   de maquetación, no un componente genérico.
   - `npx ng generate component core/layout/top-bar` (OnPush).
   - Plantilla: `<header><mat-toolbar class="bar"><div class="bar-inner"><span class="brand"><span class="brand-mark" aria-hidden="true"></span>Facturas</span><span class="spacer"></span><app-theme-toggle /></div></mat-toolbar></header>`.
   - SCSS: `.bar { border-bottom: var(--rule-total); padding-inline: 0; }`. `.bar-inner` con
     `width: min(100%, var(--page-max)); margin-inline: auto; padding-inline: var(--gutter); display: flex; align-items: center; gap: var(--space-2);`.
     `.brand` con `font: var(--type-subtitle)`, `display: inline-flex` y `gap: var(--space-2)`.
     `.brand-mark` de 3px×16px con `background: var(--carbon)` y `border-radius: 1px`.
   - La marca es un `<span>`, no un enlace: en auth, enlazar a `/inicio` rebotaría a `/login`, y no se
     cambia el comportamiento.
   - Tests nuevos (`top-bar.spec.ts`): muestra "Facturas"; contiene `app-theme-toggle`; hay un único
     `header` y contiene `mat-toolbar`; la marca no es un encabezado (`h1`–`h6`).
   Ficheros: `core/layout/top-bar/top-bar.{ts,html,scss,spec.ts}`.
   Verificación: `npm test`.

4. [x] **`MainLayout`: membrete y columna de página común.**
   - Plantilla: `<app-top-bar />` + `<main class="page"><router-outlet /></main>`. Quitar `mat-toolbar`,
     `.title` y `.spacer` de este componente y sus imports (`MatToolbar`, `ThemeToggle`).
   - SCSS: `.page { width: min(100%, var(--page-max)); margin-inline: auto; padding: var(--space-8) var(--gutter); box-sizing: border-box; }`.
     Fuera el `background`/`color` repetido.
   - Spec: los tres tests actuales siguen sin cambios ("renders the title" encuentra "Facturas" dentro
     del top-bar; `main router-outlet` sigue existiendo). Tests nuevos: "uses the shared top bar"
     (`app-top-bar` existe) y "has a single main landmark".
   Ficheros: `main-layout.{ts,html,scss,spec.ts}`.
   Verificación: `npm test`. A ojo, a 1440px, el borde izquierdo de la marca coincide con el del
   contenido.

5. [x] **`AuthLayout`: mismo membrete y hoja centrada** (decisión 6).
   - Plantilla: `<app-top-bar />` + `<main class="auth-screen"><div class="sheet"><router-outlet /></div></main>`.
     Desaparecen `.theme-corner` (el `absolute`) y `.brand`.
   - SCSS: `:host { display: flex; flex-direction: column; min-height: 100dvh; }`.
     `.auth-screen { flex: 1; display: flex; padding: var(--space-8) var(--gutter); }`.
     `.sheet { width: min(100%, var(--sheet-narrow)); margin: auto; }`. El `margin: auto` centra sin
     recortar cuando el registro es más alto que la pantalla.
   - `OnPush` **no** se añade aquí (decisión 9).
   - Spec: los tres tests actuales siguen sin cambios. Tests nuevos: "uses the shared top bar" y
     "places the router outlet inside main".
   Ficheros: `auth-layout.{ts,html,scss,spec.ts}`.
   Verificación: `npm test`. A ojo, al iniciar sesión el toggle no se mueve de sitio.

6. [x] **Alerta de formulario compartida: `shared/form-alert`.**
   - `npx ng generate component shared/form-alert/form-alert`, con la misma estructura de carpeta que
     `shared/theme-toggle/theme-toggle` y OnPush.
   - `message = input.required<string>()`. Plantilla:
     `<div class="form-alert" role="alert"><mat-icon>error</mat-icon><span>{{ message() }}</span></div>`.
     El icono `error` ya está en el subconjunto, así que no hay que regenerar la fuente.
   - SCSS según 3.9 (tokens `--space-*` y `--radius-control`).
   - Tests nuevos (`form-alert.spec.ts`): pinta el mensaje dentro de `[role="alert"]` y el icono es
     `error` (`MatIconHarness.getName()`).
   Ficheros: `shared/form-alert/form-alert/form-alert.{ts,html,scss,spec.ts}`.
   Verificación: `npm test`.

7. [x] **Formularios de login y registro: estilos compartidos y tarjeta de documento.**
   - Crear `features/auth/auth-form.scss` con el contenido común (que hoy está duplicado), reescrito con
     tokens: `:host { display: block; animation: page-enter var(--duration-enter) var(--ease-out) both; }`
     (el ancho lo pone ahora `.sheet` del layout), `.auth-card-header` con
     `padding: var(--space-6) var(--space-6) var(--space-4)` y `border-bottom: var(--rule-total)`,
     `.auth-card-content` con `padding: var(--space-6)`, `.form` con `gap: var(--space-4)` (sin
     `padding-top`), `.submit` con `width: 100%; margin-top: var(--space-2)` (24px en total desde el
     último campo) y `.switch` y sus enlaces con hover y focus según 3.9.
   - `login-form.ts` y `register-form.ts`: `styleUrl: '../auth-form.scss'`. Borrar `login-form.scss` y
     `register-form.scss`.
   - Plantillas: `<mat-card-header class="auth-card-header"><h1 mat-card-title>…</h1></mat-card-header>`,
     `<mat-card-content class="auth-card-content">` y
     `@if (serverError(); as message) { <app-form-alert [message]="message" /> }` en lugar del `div`.
     Importar `FormAlert`.
   - Los specs actuales siguen sin cambios (`[role="alert"]`, `label`, `.mask-toggle`, `button.submit`,
     textos). Tests nuevos en cada spec: "renders the title as the page h1" (un solo `h1` con el texto)
     y "does not render the alert without a server error".
   Ficheros: `features/auth/auth-form.scss` (nuevo), `login-form.{ts,html,spec.ts}`,
   `register-form.{ts,html,spec.ts}`; se borran `login-form.scss` y `register-form.scss`.
   Verificación: `npm test` (incluidos `login.spec.ts` y `register.spec.ts`) y `npm run build`
   (`anyComponentStyle` < 4 kB).

8. [x] **Inicio con cabecera de página y estado vacío** (decisión 4, opción A).
   - Plantilla:
     ```
     <section class="home">
       <header class="page-header">
         <div class="page-heading">
           <p class="meta">{{ today }}</p>
           <h1>Hola, {{ user()?.firstName }}</h1>
         </div>
         <button matButton="tonal" …>…Cerrar sesión</button>   <!-- sin cambios de lógica -->
       </header>
       <div class="empty">
         <h2>Todavía no hay nada por aquí</h2>
         <p>Cuando haya secciones disponibles, aparecerán en esta página.</p>
       </div>
     </section>
     ```
     El botón de logout tiene que seguir siendo el primer `button` del componente (lo busca el spec).
     "Cerrar sesión" se queda aquí; el menú de usuario en el membrete queda para más adelante (decisión 10).
   - `today`: fecha local formateada con `new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })`,
     con la primera letra en mayúscula ("Sábado, 18 de octubre de 2026"). Es formato de presentación:
     no hay datos inventados ni hace falta `registerLocaleData`.
   - SCSS: `:host` con `page-enter`. `.home` con `display: grid; gap: var(--space-8)`. `.page-header`
     con `display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: var(--space-4); padding-bottom: var(--space-4); border-bottom: var(--rule-total)`.
     `.meta` con `font: var(--type-meta); color: var(--ink-faint)`. `h1` con `font: var(--type-page-title); letter-spacing: -0.01em`.
     `.empty` según 3.9 (el `h2` del estado vacío usa `--type-subtitle`).
   - Spec: los cuatro tests actuales siguen sin cambios. Tests nuevos: "shows today's date in Spanish"
     (`vi.useFakeTimers()` + `vi.setSystemTime(new Date(2026, 9, 18))` → "Sábado, 18 de octubre de
     2026", restaurando los timers en `afterEach`); "renders a single h1 with the greeting"; "shows the
     empty state" (con los dos textos aprobados); "keeps the logout as the only button".
   Ficheros: `home.{ts,html,scss,spec.ts}`.
   Verificación: `npm test` y `npm run build`.

9. [x] **Marcador de arranque en `index.html`** (decisión 7).
   - En `index.html`: `<app-root><p class="boot">Facturas</p></app-root>`. Angular sustituye el
     contenido de `<app-root>` al arrancar, así que no hay JS ni cambio de comportamiento. El script
     anti-destello ya aplica `.app-dark` antes, así que el marcador sale en el tema correcto.
   - En `styles.scss`: `.boot { min-height: 100dvh; margin: 0; display: grid; place-items: center; font: var(--type-subtitle); color: var(--ink-faint); }`.
   - `app.spec.ts` no debe depender del contenido inicial de `<app-root>`: se comprueba que sigue en verde.
   Ficheros: `frontend/src/index.html`, `frontend/src/styles.scss`.
   Verificación: `npm test` y `npm run build`. En el script del paso 11, retrasar con `page.route` la
   respuesta de `POST /api/auth/refresh` (unos 2 s) y capturar el marcador en claro y en oscuro antes de
   que arranque la app.

10. [x] **`ThemeToggle`: revisión.** No cambia de código: ahora vive solo dentro de `app-top-bar`.
    Comprobar el área táctil de 48px, el anillo de foco del paso 2 y que el icono se ve en `--ink` en los
    dos modos. `theme-toggle.spec.ts` sin cambios.
    Verificación: `npm test`. Inspección en DevTools.

11. [x] (2026-10-18: 1440/390 px, claro/oscuro, todo OK. Corregido: `--ink-soft`/`--ink-faint` pasan a derivarse de on-surface (80%/65%) porque en oscuro on-surface-variant ≈ on-surface y la jerarquía colapsaba) **Verificación visual automatizada con Playwright (skill, paso 5 del workflow).**
    La hace el agente principal con **`playwright-core` instalado en el scratchpad de la sesión** (no en
    el proyecto: `frontend/package.json` y el lock no cambian) y el **Chrome del sistema**
    (`chromium.launch({ channel: 'chrome' })` o `executablePath` apuntando a Chrome). El script y las
    capturas viven también en el scratchpad.
    - Entorno: BD (`docker compose up -d db`), backend con perfil `local` y `npm start`. El usuario de
      prueba se crea por la propia UI de `/registro`.
    - Matriz: viewports **1440×900** y **390×844** × modo **claro** y **oscuro**. El modo se fuerza con
      `context.addInitScript(() => localStorage.setItem('theme', 'light' | 'dark'))`, que el script
      anti-destello respeta. Además se emula `colorScheme` a juego.
    - Capturas de página completa (`fullPage: true`) para cada combinación:
      - `/login` vacío, con errores de cliente (enviar vacío), con "Email o contraseña incorrectos" y en
        carga (retrasando `POST /api/auth/login` con `page.route`).
      - `/registro` completo (en móvil, con scroll) y con el 409.
      - `/inicio` y `/inicio` durante el logout (retrasando `POST /api/auth/logout`).
      - El marcador de arranque (paso 9).
    - Estados interactivos: `page.keyboard.press('Tab')` sucesivos con una captura del foco en botón,
      enlace, ojo y toggle; `hover()` sobre enlace y botón principal.
    - `page.emulateMedia({ reducedMotion: 'reduce' })`: comprobar con
      `getComputedStyle(...).animationName` o con capturas a 0/100 ms que no hay desplazamiento.
    - Comprobaciones automáticas en el script (con `page.evaluate`):
      - El `boundingBox()` del toggle coincide (±1px) en `/login`, `/registro` e `/inicio` a 1440px.
      - El borde izquierdo de `.brand` coincide con el de `.page` a 1440px.
      - `document.documentElement.scrollWidth <= innerWidth` a 390px (sin scroll horizontal).
      - Hay un único `h1` por vista.
      - El contraste de `--ink`, `--ink-soft` y `--ink-faint` sobre `--paper` es ≥ 4.5:1 en los dos
        modos (colores calculados con `getComputedStyle` y fórmula WCAG).
      - No hay errores en consola ni peticiones a dominios externos (`page.on('request')`).
    - Checks de la skill, revisados sobre las capturas, con el resultado anotado en el PR:
      - **Swap**: si se cambia la raya doble por un borde simple, la barra de la marca por nada y los
        radios de 4/8 por píldora/12, ¿se pierde identidad? Debe notarse en las tres vistas.
      - **Squint**: con los ojos entornados, ¿se lee "membrete → título → contenido" sin que salte ningún
        borde? Si la raya doble destaca demasiado en oscuro, se rebaja (se queda en `--rule`) y se anota.
      - **Signature**: señalar en las capturas los cinco sitios donde aparece la firma: el borde del
        membrete en `/inicio`, el borde del membrete en `/login` y `/registro`, el título de tarjeta de
        login, el título de tarjeta de registro y la cabecera de página de inicio. La barra de la marca
        también cuenta.
      - **Token**: leer en voz alta los tokens de `styles.scss` (`--paper`, `--ink`, `--rule-total`,
        `--carbon`, `--stamp`…). Deben sonar a talonario, no a una plantilla.
    Verificación: el script termina sin fallos en las comprobaciones automáticas. Capturas de antes
    (paso 0) y después en el PR, sin solapes, scroll horizontal ni textos ilegibles.

12. [x] **Build final y bundle.** `npm test` y `npm run build`. Comparar con la línea base: initial
    < 1 MB y ningún estilo de componente > 4 kB. Pasar el grep de colores fijos, `box-shadow` y
    `.mat-mdc-`/`.mdc-` de los criterios. Comprobar con `git status` que `frontend/package.json` y
    `package-lock.json` no han cambiado.
    Verificación: comandos en verde y cifras en el PR.

13. [x] **Guardar el sistema y documentarlo** (decisión 11).
    - Crear `/.interface-design/system.md` en la raíz del monorepo (donde lo busca la skill) con:
      dirección y sensación ("Libro de facturas"), Domain / Color world / Signature / Defaults
      rechazados, profundidad (solo bordes), espaciado (base 4 y escala), densidad (0; `-2` solo en
      futuras tablas), escala tipográfica (ratio, tabla de roles y 4 niveles de tinta), tokens (tabla
      3.1 con su significado), radios (botones de 4px), movimiento y los patrones de 3.9 con sus medidas
      (membrete, columna de página, cabecera de página, hoja de auth, alerta, estado vacío, marcador de
      arranque, enlaces). Incluir también una lista de "no hacer": sombras, píldoras, hex sueltos,
      selectores `.mat-mdc-*` e indigo decorativo. Y la excepción documentada de `padding-inline: 0` en
      la toolbar.
    - `frontend/CLAUDE.md`, sección **Diseño**: añadir "Antes de tocar la UI, leer
      `.interface-design/system.md` (dirección, tokens propios `--paper`/`--ink*`/`--rule*`/`--carbon`,
      escalas y patrones). Estilos de componente solo con esos tokens y `--mat-sys-*`." Y
      "Componentes de maquetación comunes: `core/layout/top-bar`, `shared/form-alert`."
    Verificación: los ficheros existen y el `git diff` del CLAUDE.md solo añade esas líneas.

## Riesgos
- **Excepción a "personalizar con overrides"**: el padding horizontal de `mat-toolbar` no tiene token de
  override. Para alinear la marca con la columna de página se pone `padding-inline: 0` en **nuestra
  clase** `.bar`, sobre nuestro propio elemento, sin selectores `.mat-*`. Es la única excepción y se
  documenta en `system.md`. Alternativa sin excepción: aceptar 16px de desalineación en pantallas anchas.
- **Nombres de tokens de los overrides**: los de 3.6 son los esperados en Material 22, pero pueden variar
  entre versiones. La build de Sass falla con claves inválidas, así que el paso 2 lo detecta.
- **`color-mix()` sobre valores `light-dark()`** (`--ink-faint`, `--ink-ghost`): está soportado en
  navegadores recientes, igual que `light-dark()` (ya aceptado en el plan de migración). Si algún
  navegador no lo resolviera, se usaría `--mat-sys-on-surface-variant` directamente en el nivel 3, con
  solo tres niveles reales, y se anotaría.
- **`prefers-reduced-motion` y Material**: no se ha comprobado si Material 22 desactiva solo sus
  animaciones (ripple, etiqueta flotante) con esa preferencia. Se revisa en el paso 11. Si no lo hace,
  se plantea como duda (por ejemplo, el token `MATERIAL_ANIMATIONS`) y no se cambia sin preguntar.
- **`h1 mat-card-title`**: cambia el elemento de `div` a `h1`. Material lo admite como selector de
  atributo, pero los estilos del título vienen de los overrides del paso 2 y hay que comprobar que no
  aparece el margen del `h1` del navegador (el reset global del paso 1 lo evita).
- **`tabular-nums` global**: con la pila del sistema, algunos textos con números en prosa se ven algo
  más anchos. Se acepta por coherencia con una app de cifras; si molesta, se limitaría a tablas e
  importes futuros.
- **Cambio de una decisión anterior**: el plan de migración aceptó "Facturas encima de la tarjeta y el
  toggle en la esquina". La decisión 6 de este plan (aprobada por el usuario) lo sustituye por el
  membrete común. El plan de migración no se modifica.
- **Verificación visual con Playwright fuera del proyecto**: `playwright-core` se instala en el
  scratchpad de la sesión y usa el Chrome del sistema, así que **no es una dependencia del proyecto** y
  no cambia `package.json` (se comprueba en el paso 12). Riesgos:
  - Si la versión de `playwright-core` no es compatible con el Chrome instalado, se usa una versión de
    `playwright-core` que lo soporte. No se descargan navegadores de Playwright sin preguntar.
  - Las capturas dependen de las fuentes del sistema de la máquina (pila del sistema): sirven para
    revisar, no como snapshots de regresión. No se añaden al repo.
  - El script necesita el backend y la BD arrancados para los flujos reales. Los estados de carga se
    provocan retrasando las peticiones con `page.route`, sin modificar el backend.
  - El script y las capturas se quedan en el scratchpad: no se suben al repo ni se convierten en tests E2E
    del proyecto (eso sería otro plan, con Playwright como dependencia aprobada).
- **Marcador de arranque**: si algún test (`app.spec.ts`) o el bootstrap dependieran de que `<app-root>`
  empiece vacío, fallaría. Se comprueba en el paso 9.
- **Budget `anyComponentStyle`**: `auth-form.scss` se compila una vez por componente. Debe quedar muy por
  debajo de 4 kB y se mide en el paso 7.

## Decisiones
Aprobadas por el usuario el 2026-10-18.

**Dirección visual aprobada:**
```
Domain:      talonario y matriz, serie/número correlativo, base imponible, IVA/IRPF, trimestre (303/130),
             vencimiento, cobrada/pendiente/vencida, libro registro, membrete, gestoría
Color world: papel blanco roto, azul violáceo del papel de calco y la tinta de sello, grafito de los
             filetes, rojo de sello "VENCIDA", verde apagado de "COBRADA", amarillo de subrayador
Signature:   "la raya de total": doble filete contable bajo el membrete y cada título de documento,
             junto con el margen de talonario (barra de calco) delante de la marca
Rejecting:   sidebar + KPIs inventados → inicio honesto con datos reales y estado vacío;
             indigo decorativo/degradados → indigo solo como tinta de acción (≤10%);
             tarjetas con sombra + píldoras + marca aislada en login → papel plano con filetes,
             radios de documento 4/8 y el mismo membrete en todas las vistas
Direction:   "Libro de facturas": una sola superficie de papel, estructura de filetes finos, firma de
             raya doble, tinta de calco para la acción, jerarquía por peso y tinta y cifras tabulares
```

1. **Color de marca**: se mantiene el indigo `#6366F1` (paletas actuales de `_theme-colors.scss`), usado
   **solo para la acción y la identidad** (`--carbon`): botón principal, enlaces, foco y barra de la marca.
2. **Tipografía**: pila del sistema. No se descarga ninguna fuente de texto. IBM Plex Sans queda
   descartada por ahora.
3. **Densidad**: `0` en toda la app. Cuando lleguen las tablas, `-2` solo en el contenedor de tabla
   (otro plan).
4. **`/inicio`**: opción A. Fecha de hoy en español + "Hola, <nombre>" + "Cerrar sesión" + estado vacío
   con el título "Todavía no hay nada por aquí" y el texto "Cuando haya secciones disponibles,
   aparecerán en esta página.". Sin CTA, sin datos inventados y sin trimestre.
5. **Navegación lateral**: más adelante, cuando haya al menos dos secciones reales.
6. **Membrete en auth**: opción A. La misma `app-top-bar` en la app y en auth. Desaparecen la marca
   encima de la tarjeta y el toggle en `absolute`.
7. **Marcador de arranque**: sí. "Facturas" estático dentro de `<app-root>` en `index.html` (paso 9).
8. **Radio de los botones**: 4px (`--radius-control`) en `matButton` (filled, tonal, outlined y text).
   Los `matIconButton` siguen circulares.
9. **`OnPush` que falta** en `Home`, `AuthLayout`, `LoginForm`, `RegisterForm`, `Login` y `Register`:
   fuera de este plan, en un cambio aparte (comprobando antes si Angular 22 lo aplica por defecto). Los
   componentes nuevos de este plan sí son OnPush.
10. **Menú de usuario**: más adelante. "Cerrar sesión" se queda en la cabecera de página de inicio.
11. **`system.md`**: en `/.interface-design/system.md`, en la raíz del monorepo, referenciado desde
    `frontend/CLAUDE.md`.
