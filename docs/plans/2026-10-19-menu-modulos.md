# Menú de módulos e Inicio sin libro registro

**Estado: APROBADO por el usuario (2026-10-19)**, a partir del lienzo "Menú de módulos" y del cambio de
dominio a gastos compartidos (ver CLAUDE.md raíz y `.interface-design/system.md`).

## Ámbito
Solo frontend. No cambian la API ni las rutas existentes.

## Cambios
1. **Lista de módulos** (`core/layout/module-nav/modules.ts`): `{ label, path }[]` (sin ruta = no disponible) con Inicio
   (`/inicio`, disponible) y Grupos (sin ruta, no disponible). Añadir un módulo = añadir una entrada.
2. **`ModuleNav`** (`core/layout/module-nav`), dentro de `TopBar` tras la marca y solo con sesión:
   - Escritorio: `nav` con enlaces `routerLink` estilados como pestañas; activo con `routerLinkActive` y
     `aria-current`. Pendientes: `span` con `aria-disabled` y la etiqueta "Próximamente".
     (Se probó `mat-tab-nav-bar`, pero en Material 22 exige un `mat-tab-nav-panel`, es decir, semántica de
     pestañas que controlan un panel; para navegación del sitio lo correcto son enlaces normales.)
   - Bajo 600px: botón de icono `menu` que abre un `mat-menu` con los mismos módulos (activo marcado con
     `aria-current`, pendientes desactivados con "Próximamente").
   - Desviación del lienzo: en móvil se usa `mat-menu` (componente de Material) en vez de un panel a todo
     el ancho con velo, siguiendo la regla de usar Material antes que un componente propio.
3. **Inicio**: se quita el libro registro (vocabulario fiscal). Queda saludo + estado vacío
   "Aún no tienes grupos" sin CTA (Grupos aún no existe).
4. **Sistema**: Iconos nuevos `groups` y `menu`; se quitan del subconjunto los que ya no se usan
   (`description`). `system.md` actualizado.

## Tests
- `module-nav`: enlaces y estado activo, pendientes desactivados con "Próximamente", menú móvil, nada sin
  sesión.
- `top-bar`: contiene la navegación de módulos.
- `home`: saludo, estado vacío, sin tabla ni botones.
