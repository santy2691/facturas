# Sistema de diseño: "Libro de facturas"

Aplicación para autónomos y pymes en España que emiten, revisan y cobran facturas. Debe sentirse como un
**talonario bien llevado**: papel claro, tinta precisa, filetes finos, cifras alineadas. Serio y ordenado,
sin la frialdad de un terminal ni la alegría de un SaaS de marketing.

Todo vive en `frontend/src/styles.scss` (tokens en `html`, tras `mat.theme()`). Sin hex: todo sale de `--mat-sys-*`.

## Dominio
Talonario y matriz, serie y número correlativo (`2026/0001`), base imponible, IVA e IRPF, NIF/CIF,
trimestre (303/130), vencimiento, cobrada/pendiente/vencida, libro registro, membrete, gestoría, sello.

## Mundo de color
Blanco roto del papel; azul violáceo del papel de calco y la tinta de sello (indigo `#6366F1`, definido solo
en `src/styles/_theme-colors.scss`); grafito de los filetes; rojo de sello (errores y vencidas); verde apagado de
"cobrada" (futuro); amarillo de subrayador (no se usa en la interfaz).

## Firma: "la raya de total"
Doble filete contable (`--rule-total`, `3px double`) bajo el membrete y bajo cada título de documento, más el
**margen de talonario**: barra de 3x16px en `--carbon` delante de la marca.

## Defaults rechazados
1. Barra lateral y KPIs inventados -> inicio con datos reales (fecha, saludo) y estado vacío honesto.
2. Indigo decorativo, degradados -> indigo solo como tinta de acción e identidad (<=10%).
3. Tarjetas con sombra, botones píldora, marca aislada en login -> papel plano con filetes, radios 4/8 y el
   mismo membrete en todas las vistas.

## Profundidad
**Solo bordes.** Filetes de 1px en `--rule`, `--rule-total` como firma, ninguna sombra propia. Tarjetas
`appearance="outlined"`, toolbar sin elevación. Los overlays de Material (menús, diálogos) pueden llevar la
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
| `--rule-total` | `3px double var(--rule)`: la firma |
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
toolbar (fondo paper, altura 56px), card outlined (paper, borde rule, radio sheet, título 28/600), button
(radio control en filled/tonal/outlined/text) y `mat.strong-focus-indicators` (2px sólido en `--carbon`).

## Patrones
- **Membrete** (`core/layout/top-bar`): `<header>` + `mat-toolbar` 56px, borde inferior `--rule-total`, contenido
  centrado en `--page-max` con padding `--gutter`. Marca (barra 3x16px `--carbon`, 8px de separación, "Facturas"
  16/24/600) a la izquierda y toggle a la derecha. Igual en app y en auth. La marca es un `<span>`, no un enlace.
- **Columna de página** (`MainLayout`): `width: min(100%, var(--page-max))`, centrada, padding `--space-8 --gutter`.
- **Cabecera de página** (inicio): metadato 12/500 `--ink-faint` sobre el h1 (28/600), 4px entre ambos; acciones a
  la derecha con `flex-wrap`; padding inferior 16px y `--rule-total` debajo.
- **Hoja de auth**: columna `min(100%, var(--sheet-narrow))` centrada con `margin: auto`. Tarjeta outlined radio 8px,
  padding 24px; cabecera con `h1` y `--rule-total` debajo. Formulario con gap 16px, botón principal a 24px del
  último campo, enlace secundario a 16px.
- **Alerta de formulario** (`shared/form-alert`): `role="alert"`, error-container, radio 4px, padding 12/16,
  icono `error` de 20px y 8px de separación del texto.
- **Estado vacío**: borde 1px `--rule`, radio 8px, padding 32px. Título 16/600 `--ink`, texto 14px `--ink-soft`,
  máx. 48ch, sin CTA.
- **Marcador de arranque** (`index.html`): `<p class="boot">Facturas</p>` dentro de `<app-root>`, centrado,
  16/600 `--ink-faint`, sin JS.
- **Enlaces de texto**: `--carbon`, subrayado 1px con `text-underline-offset: 2px` (2px en hover); en
  `:focus-visible` outline 2px `--carbon`, offset 2px.

## No hacer
- Sombras (`box-shadow`) propias.
- Botones píldora (salvo los `matIconButton`).
- Colores hex/rgb/hsl sueltos; todo con `--mat-sys-*` o los tokens de arriba.
- Selectores `.mat-mdc-*` / `.mdc-*`; personalizar con `mat.<componente>-overrides()`.
- Indigo decorativo (degradados, fondos de color): `--carbon` solo para acción e identidad.
- Valores sueltos de espaciado, radio o tamaño de letra: usar `--space-*`, `--radius-*`, `--type-*`.

## Excepción documentada
`mat-toolbar` no tiene token de override para su padding horizontal. Para alinear la marca con la columna de
página, `.bar` (nuestra clase, en `top-bar.scss`) pone `padding-inline: 0`, y `.bar-inner` aplica `--gutter`.
Es la única excepción.
