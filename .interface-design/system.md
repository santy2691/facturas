# Sistema de diseño: "Cuaderno de gastos"

Aplicación para que grupos de usuarios (pisos compartidos, viajes, familias, amigos) registren y repartan
**gastos compartidos**. Debe sentirse como un **cuaderno de cuentas bien llevado**: papel claro, tinta precisa,
filetes finos, cifras alineadas. Claro y de confianza para hablar de dinero entre conocidos, sin la frialdad de
un programa de contabilidad ni la alegría de un SaaS de marketing.

Todo vive en `frontend/src/styles.scss` (tokens en `html`, tras `mat.theme()`). Sin hex: todo sale de `--mat-sys-*`.

## Dominio
Grupo, miembro, gasto (siempre dentro de un grupo), quién pagó, entre quiénes se reparte, parte de cada uno,
saldo, quién debe a quién, saldar. No es contabilidad fiscal: nada de IVA, IRPF, base imponible ni libro
registro. La palabra "factura" no se usa para el dominio (solo en el nombre provisional de la app).

## Mundo de color
Blanco roto del papel; azul violáceo del papel de calco y la tinta de sello (indigo `#6366F1`, definido solo
en `src/styles/_theme-colors.scss`); grafito de los filetes; rojo de sello (solo errores); verde apagado
para "saldado" (futuro, si llega a usarse, siempre acompañado de texto o icono); amarillo de subrayador (no se
usa en la interfaz).

## Firma: "margen del cuaderno"
Barra de 3x16px en `--carbon` delante de la marca. Los separadores son siempre un único filete de 1px en `--rule`:
**nunca dobles filetes** (`border-style: double` ni dos líneas paralelas). Los títulos no llevan línea debajo; se
separan del contenido con espacio.

## Defaults rechazados
1. Barra lateral y KPIs inventados -> inicio con datos reales (fecha, saludo) y estado vacío honesto.
2. Indigo decorativo, degradados -> indigo solo como tinta de acción e identidad (<=10%).
3. Tarjetas con sombra, botones píldora, marca aislada en login -> papel plano con filetes, radios 4/8 y el
   mismo membrete en todas las vistas. Login y registro sin tarjeta: el formulario va directamente sobre el papel.
4. Botón de cerrar sesión en la página -> menú de cuenta en el membrete.
5. Barra lateral de navegación -> pestañas de módulos en el membrete (pocos módulos: Inicio, Grupos) y
   pestañas de sección dentro de cada grupo (Gastos, Miembros).

## Profundidad
**Solo bordes.** Filetes simples de 1px en `--rule`, ninguna sombra propia. Toolbar
sin elevación. Los overlays de Material (menús, diálogos) pueden llevar la
suya. Una sola superficie (`--paper`) para lienzo, cabecera y tarjetas.

## Tokens
| Token | Significado |
|---|---|
| `--paper` | lienzo, cabecera y tarjetas (`surface`) |
| `--ink` | texto nivel 1 |
| `--ink-soft` | texto nivel 2 (apoyo): mezcla 80% de on-surface con surface (8.7:1 claro / 9.4:1 oscuro) |
| `--ink-faint` | texto nivel 3 (metadatos): mezcla 65% de on-surface con surface (5.2:1 claro / 6.6:1 oscuro). No usar on-surface-variant: en la paleta oscura generada es casi igual que on-surface |
| `--ink-ghost` | texto nivel 4 (deshabilitado, 38%) |
| `--rule` | filetes, bordes de tarjeta, separadores |
| `--carbon` | tinta de calco: acción principal, enlaces, foco, barra de la marca |
| `--stamp` | sello rojo: solo errores |

Jerarquía de texto en 4 niveles: ink -> ink-soft -> ink-faint -> ink-ghost.

## Espaciado
Base 4px. Escala: `--space-1` 4, `-2` 8, `-3` 12, `-4` 16, `-6` 24, `-8` 32, `-12` 48, `-16` 64.
Micro 4-8 (icono-texto), componente 12-16 (entre campos), sección 24-32 (padding de tarjeta, bloques de
página), mayor 48-64. Maquetación: `--gutter` 24px (16px bajo 600px), `--page-max` 1120px, `--sheet-narrow`
400px, `--bar-height` 56px. Padding simétrico, sin apaños. Densidad de Material `0` (`-2` solo en futuras tablas).

## Radios
`--radius-control` 4px (campos, botones `matButton`, alertas) · `--radius-sheet` 8px (tarjetas, estado vacío) ·
`--radius-overlay` 12px (menús, diálogos). Excepción: los `matIconButton` son círculos.

## Tipografía
Pila del sistema. Ratio ~1.25 desde 14px, ajustado a la escala M3. Jerarquía por tamaño, peso (400/500/600) y
color. `tabular-nums` global, `text-wrap: balance` en h1-h3, `pretty` en p, `-webkit-font-smoothing: antialiased`.

| Rol | Token | Tamaño / interlineado | Peso | Color |
|---|---|---|---|---|
| Título de página (h1) | `--type-page-title` | 28 / 36 | 600, tracking -0.01em | ink |
| Sección (h2) | `--type-section` | 22 / 28 | 600 | ink |
| Subtítulo / marca | `--type-subtitle` | 16 / 24 | 600 | ink |
| Cuerpo | `--type-body` | 14 / 20 | 400 | ink / ink-soft |
| Metadato | `--type-meta` | 12 / 16 | 500 | ink-faint |
| Caption | `--type-caption` | 11 / 16 | 500 | ink-faint |

## Movimiento
Solo la entrada de página: `page-enter` (opacity + translateY 4px), `--duration-enter` 200ms,
`--ease-out` `cubic-bezier(0.23, 1, 0.32, 1)`. Con `prefers-reduced-motion: reduce` solo opacity. El cambio de
tema no se anima.

## Overrides de Material (en `styles.scss`, con `mat.<componente>-overrides()`)
toolbar (fondo paper, altura 56px), menu (fondo paper, radio overlay), table (fondo paper, cabecera 11/500
`--ink-faint` con tracking 0.04em, filas con filete `--rule`), button (radio control en filled/tonal/outlined/text)
y `mat.strong-focus-indicators` (2px sólido en `--carbon`).

## Patrones
- **Membrete** (`core/layout/top-bar`): `<header>` + `mat-toolbar` 56px, borde inferior 1px `--rule`, contenido
  centrado en `--page-max` con padding `--gutter`. Marca (barra 3x16px `--carbon`, 8px de separación, "Facturas"
  16/24/600) a la izquierda, seguida (con sesión) de las pestañas de módulos; a la derecha el toggle y, con
  sesión, el menú de cuenta. Igual en app y en auth. La
  marca es un `<span>`, no un enlace.
- **Menú de cuenta** (`core/layout/account-menu`): `matButton` de texto con avatar (32px, radio control,
  `primary-container` / `on-primary-container`, iniciales 12/600), nombre (oculto bajo 600px; el `aria-label`
  lleva el nombre completo) y `expand_more`. Abre un `mat-menu` con nombre (14/600) y email (12/500 `--ink-faint`)
  sobre un filete `--rule`, y el item "Cerrar sesión" con icono `logout`. Mientras cierra sesión, spinner en el
  botón y `aria-busy`.
- **Columna de página** (`MainLayout`): `width: min(100%, var(--page-max))`, centrada, padding `--space-8 --gutter`.
- **Cabecera de página** (inicio): metadato 12/500 `--ink-faint` sobre el h1 (28/600), 4px entre ambos; sin
  línea debajo (32px de espacio hasta el contenido).
- **Hoja de auth**: columna `min(100%, var(--sheet-narrow))` centrada con `margin: auto`, **sin tarjeta**.
  Cabecera: metadato en mayúsculas (12/500 `--ink-faint`, tracking 0.04em; "Acceso", "Alta de usuario") sobre
  el `h1`, 4px entre ambos y 32px hasta el formulario, sin línea. Formulario con gap 16px, botón principal a
  24px del último campo, enlace secundario a 16px.
- **Grupos de campos**: `fieldset` sin borde con `legend` en caption (11/500 mayúsculas `--ink-faint`), 12px
  hasta el primer campo. Grupos siguientes con filete superior 1px `--rule` y 16px de padding. Campos cortos
  emparentados (nombre y apellidos) en fila con `flex-wrap` y `flex: 1 1 160px`.
- **Requisitos de contraseña**: lista bajo el campo (8px), 12/500, `aria-live="polite"` y enlazada con
  `aria-describedby`. Pendiente: `radio_button_unchecked` en `--ink-faint`; cumplido: `check` en `--ink`. Se
  distinguen por forma y luminosidad, nunca solo por tono.
- **Pestañas de módulos** (`core/layout/module-nav`, lista en `modules.ts`): `nav` "Módulos" con enlaces normales
  (`routerLink`, no `mat-tab-nav-bar`: es navegación del sitio, no pestañas de un panel) a 24px de la marca, items de
  la altura de la barra con padding 0 12px y 4px entre ellos. Activo: `--ink` 600 y raya inferior 2px `--carbon`
  apoyada sobre el filete de la barra, `aria-current="page"`. Inactivo: `--ink-soft` 500.
- **Módulo pendiente**: item desactivado (`aria-disabled`, sin enlace) en `--ink-faint` con la etiqueta
  **Próximamente** (caption 11/500, borde 1px `--rule`, radio control, padding 0 6px). Se usa igual en módulos y
  secciones. Los módulos se declaran en una lista (etiqueta y ruta; sin ruta = no disponible).
- **Menú de módulos en móvil** (bajo 600px): las pestañas se ocultan y aparece un `matIconButton` `menu` delante
  de la marca que abre un `mat-menu` con los mismos módulos. Activo: 600 con la barra 3x16px `--carbon` de la
  marca delante y `aria-current="page"`; pendientes desactivados (sin atenuar, en `--ink-faint`) con
  "Próximamente". El menú de cuenta muestra solo las iniciales.
- **Detalle de grupo** (pendiente de implementar): ruta "Grupos / <nombre>" (12/500, enlace en `--carbon`)
  sobre el `h1`; debajo, pestañas de sección (Gastos, Miembros) de 48px sobre un filete 1px `--rule`, con el
  mismo estilo de activo y pendiente que las de módulos y `overflow-x: auto` en móvil.
- **Tabla de datos** (para gastos y miembros): `mat-table` dentro de una hoja con borde 1px `--rule`, radio 8px
  y `overflow-x: auto`. Importes alineados a la derecha. Vacía: fila `*matNoDataRow` con el patrón de estado
  vacío.
- **Alerta de formulario** (`shared/form-alert`): `role="alert"`, error-container, radio 4px, padding 12/16,
  icono `error` de 20px y 8px de separación del texto.
- **Estado vacío**: icono de 32px en `--ink-faint`, título 16/600 `--ink`, texto 14px `--ink-soft`, máx. 48ch,
  centrado, padding 48/24, sin CTA mientras no exista la acción. Dentro de su contenedor (p. ej. la tabla).
- **Marcador de arranque** (`index.html`): `<p class="boot">Facturas</p>` dentro de `<app-root>`, centrado,
  16/600 `--ink-faint`, sin JS.
- **Enlaces de texto**: `--carbon`, subrayado 1px con `text-underline-offset: 2px` (2px en hover); en
  `:focus-visible` outline 2px `--carbon`, offset 2px.

## No hacer
- Vocabulario fiscal o de facturación (IVA, IRPF, base imponible, libro registro, "factura" como concepto).
- Sombras (`box-shadow`) propias.
- Dobles filetes (`border-style: double`, dos líneas paralelas) y líneas bajo los títulos.
- Botones píldora (salvo los `matIconButton`).
- Colores hex/rgb/hsl sueltos; todo con `--mat-sys-*` o los tokens de arriba.
- Selectores `.mat-mdc-*` / `.mdc-*`; personalizar con `mat.<componente>-overrides()`.
- Indigo decorativo (degradados, fondos de color): `--carbon` solo para acción e identidad.
- Valores sueltos de espaciado, radio o tamaño de letra: usar `--space-*`, `--radius-*`, `--type-*`.

## Excepción documentada
`mat-toolbar` no tiene token de override para su padding horizontal. Para alinear la marca con la columna de
página, `.bar` (nuestra clase, en `top-bar.scss`) pone `padding-inline: 0`, y `.bar-inner` aplica `--gutter`.
Es la única excepción.
