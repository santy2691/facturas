# Instalación de PrimeNG 22, tema Aura personalizado, modo oscuro y layout base

Nota (2026-10-18): PrimeNG sustituido por Angular Material; ver `2026-10-18-migracion-angular-material.md`

**Estado: APROBADO por el usuario (2026-10-18).**

## Objetivo
Dejar el frontend preparado para construir pantallas con PrimeNG: librería y
PrimeIcons instalados, preset propio sobre Aura en `src/app/theme.ts`, modo
oscuro con la clase `.app-dark` en `<html>`, un `ThemeService` con signals y un
layout base con cabecera que contiene el botón para alternar claro/oscuro.

## Ámbito
frontend

## Estado actual (análisis)
- `frontend/package.json`: Angular 22.2, sin PrimeNG, PrimeIcons ni `@primeuix/themes`.
- `src/app/app.config.ts`: solo `provideBrowserGlobalErrorListeners()` y `provideRouter(routes)`.
- `src/app/app.routes.ts`: `routes = []`. **No existen todavía rutas de login ni registro.**
- `src/app/app.html`: placeholder por defecto de Angular CLI + `<router-outlet />`.
- `src/app/app.spec.ts`: comprueba que el `h1` contiene "Hello, frontend" (se romperá al quitar el placeholder; hay que actualizarlo, no borrarlo).
- `src/app/app.ts`: sin `ChangeDetectionStrategy.OnPush` (el CLAUDE.md lo exige por defecto).
- `src/styles.scss` vacío; `index.html` con `lang="en"` y título "Frontend".
- No existen las carpetas `core/`, `shared/`, `features/`.
- `.mcp.json` ya tiene configurado el MCP `primeng` (obligatorio consultarlo antes de usar componentes).
- Budget de producción: inicial 500 kB warning / 1 MB error.

## Criterios de aceptación
- Dado el proyecto, cuando se ejecuta `npm run build`, entonces compila sin errores y sin superar el budget de error (1 MB).
- Dado el proyecto, cuando se ejecuta `npm test`, entonces pasan todos los tests (incluidos los nuevos).
- Dado que se arranca la app, cuando se carga cualquier ruta del layout, entonces se ve una cabecera con el texto "Facturas" a la izquierda y el botón de tema a la derecha, sin logo ni menú de usuario, y debajo el contenido de la ruta (`<router-outlet>`).
- Dado el modo claro, cuando el usuario pulsa el botón de tema, entonces se añade la clase `app-dark` a `<html>`, se guarda `'dark'` en `localStorage['theme']` y los componentes PrimeNG y la cabecera se muestran en oscuro.
- Dado el modo oscuro, cuando el usuario pulsa el botón de tema, entonces se elimina `app-dark` de `<html>`, se guarda `'light'` en `localStorage['theme']` y vuelve el modo claro.
- Dado el modo claro, el botón muestra el icono `pi pi-moon` y tiene `aria-label="Activar modo oscuro"`; en modo oscuro muestra `pi pi-sun` y `aria-label="Activar modo claro"`. Sin tooltip.
- Dado que `localStorage['theme']` vale `'dark'`, cuando se recarga la página, entonces la app arranca en oscuro sin destello claro previo.
- Dado que `localStorage['theme']` vale `'light'` y el sistema está en oscuro, cuando se carga la app, entonces arranca en claro (lo guardado gana al sistema).
- Dado que no hay valor guardado y el sistema está en oscuro (`prefers-color-scheme: dark`), cuando se carga la app, entonces arranca en oscuro.
- Dado que no hay valor guardado y el sistema está en claro o no informa preferencia, cuando se carga la app, entonces arranca en claro.
- Dado que la app está abierta, cuando el usuario cambia el tema del sistema operativo, entonces la app NO cambia (no se reacciona en caliente).
- Caso límite: si `localStorage` no está disponible (lanza excepción) o `theme` contiene un valor distinto de `'light'`/`'dark'`, se ignora y se aplica la regla de sistema → claro, sin errores en consola.
- Dado el preset, cuando se inspecciona `var(--p-primary-color)`, entonces corresponde a la paleta `indigo` de Aura (no al esmeralda por defecto).
- Dado cualquier estilo propio del layout, entonces solo usa variables CSS de PrimeNG (`var(--p-content-background)`, `var(--p-content-border-color)`, `var(--p-text-color)`...); ningún color fijo.
- `index.html` tiene `lang="es"` y `<title>Facturas</title>`.

## Pasos — frontend

> Antes de cada paso que use componentes PrimeNG: consultar API y ejemplos con
> el MCP `primeng` (instalación/configuración, theming, `Button`, `Toolbar`).
> Al terminar, validar con `validate_usage`.

1. [x] **Instalar dependencias (aprobadas).**
   `cd frontend && npm install primeng@^22 @primeuix/themes primeicons`
   Confirmar con el MCP `primeng` las versiones compatibles con PrimeNG 22.
   **Si el MCP o npm indican que `@angular/animations` (o cualquier otra dependencia
   no listada) es imprescindible, PARAR y preguntar al usuario antes de instalarla.**
   No usar `--force` ni `--legacy-peer-deps`.
   Ficheros: `frontend/package.json`, `frontend/package-lock.json`.
   Verificación: `npm ls primeng @primeuix/themes primeicons` sin errores de peer; `npm run build` pasa.

2. [x] **Crear el preset en `src/app/theme.ts`.**
   `export const AppPreset = definePreset(Aura, { semantic: { primary: { 50: '{indigo.50}', …, 950: '{indigo.950}' } } })`
   (todas las paradas 50, 100…900, 950). `surface`, radios y tipografía: los de Aura, sin tocar.
   Fichero: `frontend/src/app/theme.ts` (fichero de configuración, no se genera con `ng generate`).
   Verificación: `npm run build` compila.

3. [x] **Configurar PrimeNG en `app.config.ts`.**
   Añadir `providePrimeNG({ theme: { preset: AppPreset, options: { darkModeSelector: '.app-dark' } } })`.
   No añadir `provideAnimationsAsync()` salvo que sea imprescindible (ver paso 1: parar y preguntar).
   Fichero: `frontend/src/app/app.config.ts`.
   Verificación: `npm run build`; al arrancar, en DevTools existen variables `--p-*` y `--p-primary-color` es indigo.

4. [x] **Importar PrimeIcons y estilos base globales.**
   En `src/styles.scss`: importar `primeicons/primeicons.css` (o añadirlo a `styles`
   en `angular.json`, según indique el MCP) y estilos mínimos de `body` solo con
   variables de PrimeNG (`margin: 0; background: var(--p-content-background); color: var(--p-text-color);`).
   Ficheros: `frontend/src/styles.scss` (y quizá `frontend/angular.json`).
   Verificación: `npm run build`; un `<i class="pi pi-sun">` se renderiza.

5. [x] **Script inline anti-destello en `index.html`.**
   En `<head>`, antes de cualquier hoja de estilos/bootstrap, un `<script>` pequeño que:
   lee `localStorage.getItem('theme')` dentro de `try/catch`; si es `'dark'` → oscuro,
   si es `'light'` → claro; si no es válido o falla → `window.matchMedia('(prefers-color-scheme: dark)').matches`;
   si es oscuro añade `app-dark` a `document.documentElement`.
   Cambiar también `lang="es"` y `<title>Facturas</title>`.
   Fichero: `frontend/src/index.html`.
   Verificación: con `localStorage.theme = 'dark'` y recarga, `<html>` tiene `app-dark` antes de que Angular arranque (sin destello); `npm run build` pasa.

6. [x] **Crear `ThemeService` en `core/`.**
   `npx ng generate service core/theme/theme` (nombre final según convención del CLI 22).
   API:
   - `readonly isDark: Signal<boolean>` (signal privada expuesta con `asReadonly()`).
   - `toggle(): void` — invierte el modo.
   - `setDark(value: boolean): void` — actualiza la signal, añade/quita `app-dark` en
     `document.documentElement` (vía `inject(DOCUMENT)`, nunca `document` global) y
     guarda `'dark'`/`'light'` en `localStorage['theme']` (en `try/catch`).
   - Estado inicial con **la misma lógica que el script inline**: `localStorage['theme']`
     válido → ese valor; si no, `matchMedia('(prefers-color-scheme: dark)')`; si no hay
     `matchMedia` o falla → claro. Al inicializar se sincroniza la clase de `<html>` pero
     **no se escribe** en `localStorage` (solo se guarda cuando el usuario elige).
   - Sin listener de cambios de `prefers-color-scheme`.
   Tests (`theme.spec.ts`, mockeando `localStorage` y `matchMedia`):
   - sin valor guardado y sistema claro → `isDark()` false, `<html>` sin `app-dark`.
   - sin valor guardado y sistema oscuro → `isDark()` true, `<html>` con `app-dark`.
   - guardado `'light'` y sistema oscuro → claro; guardado `'dark'` y sistema claro → oscuro.
   - valor guardado inválido (`'azul'`) → se aplica la regla de sistema.
   - `localStorage` que lanza excepción → no rompe, se aplica la regla de sistema.
   - la inicialización no escribe en `localStorage`.
   - `toggle()` cambia `isDark()`, la clase de `<html>` y guarda el valor; segundo `toggle()` lo revierte.
   - `setDark(true)` dos veces es idempotente.
   Verificación: `npm test` pasa.

7. [x] **Crear el botón de tema en `shared/`.**
   `npx ng generate component shared/theme-toggle/theme-toggle`
   Componente OnPush con `p-button` (variante texto, redondeado, solo icono) que
   inyecta `ThemeService` directamente y llama a `toggle()`. Icono `pi pi-moon` y
   `aria-label="Activar modo oscuro"` en claro; `pi pi-sun` y `aria-label="Activar modo claro"` en oscuro. Sin tooltip.
   Tests (servicio mockeado con una signal controlable): se renderiza un `p-button`;
   el click llama a `toggle()`; icono y `aria-label` correctos en cada modo.
   Verificación: `npm test`; `validate_usage` del MCP sobre `p-button`.

8. [x] **Crear el layout base con cabecera en `core/layout/`.**
   `npx ng generate component core/layout/main-layout`
   - Cabecera con `p-toolbar` (consultar MCP): a la izquierda el texto "Facturas", a la derecha `<app-theme-toggle />`. Sin logo ni menú de usuario.
   - Debajo, `<main>` con `<router-outlet />`.
   - SCSS solo con variables `--p-*`.
   - OnPush.
   Tests: renderiza "Facturas"; contiene `app-theme-toggle`; contiene un `router-outlet` (con `provideRouter([])`).
   Verificación: `npm test`, `validate_usage`.

9. [x] **Conectar el layout con las rutas.**
   En `app.routes.ts`: ruta padre `{ path: '', component: MainLayout, children: [] }`.
   Login y registro irán en el futuro **fuera** de este layout (rutas hermanas de primer nivel con una pantalla mínima); ahora no se crean.
   Fichero: `frontend/src/app/app.routes.ts`.
   Verificación: `npm start` → en http://localhost:4200 se ve la cabecera.

10. [x] **Limpiar el componente raíz.**
    - `app.html`: eliminar el placeholder de Angular; dejar solo `<router-outlet />`.
    - `app.ts`: quitar la signal `title`; añadir `changeDetection: ChangeDetectionStrategy.OnPush`; inyectar `ThemeService` (o usar `provideAppInitializer` en `app.config.ts`) para que se instancie al arrancar aunque la ruta no tenga layout (p. ej. el futuro login).
    - `app.scss`: vaciar.
    - `app.spec.ts`: sustituir el test "should render title" por uno que compruebe que renderiza `router-outlet` (actualizar, no borrar sin reemplazo).
    Verificación: `npm test` y `npm run build` pasan.

11. [ ] **Verificación final.**
    - `npm test` y `npm run build` en verde; revisar tamaño del bundle inicial frente al budget.
    - `validate_usage` del MCP `primeng` sobre los componentes usados.
    - Comprobación manual: alternar el tema, recargar (se mantiene, sin destello), borrar `localStorage.theme` y comprobar que sigue al sistema; cabecera, botón y fondo se ven bien en ambos modos.

## Riesgos
- **Compatibilidad de versiones**: PrimeNG 22 con Angular 22.2 / TypeScript 6. Si hay conflictos de peer, parar y preguntar.
- **`@angular/animations`**: si resulta imprescindible, el ejecutor debe parar y preguntar (dependencia no aprobada).
- **Budget de producción** (500 kB warning): PrimeNG + estilos del tema pueden acercarse; importar solo los componentes usados (`Button`, `Toolbar`).
- **Lógica duplicada** entre el script inline de `index.html` y `ThemeService` (lectura de `localStorage` + `prefers-color-scheme`). Es intencionado para evitar el destello; ambos deben mantenerse alineados (los tests del servicio documentan la regla). Si en el futuro se añade una CSP estricta, el script inline necesitará hash o nonce.
- **`localStorage`**: el CLAUDE.md prohíbe guardar tokens ahí, no preferencias de UI; guardar `theme` no viola la regla.
- **ThemeToggle inyecta el servicio**: se desvía levemente de la separación contenedor/presentación por simplicidad (decisión del usuario).
- **Test existente `app.spec.ts`**: se reemplaza su aserción porque el placeholder desaparece; no se desactiva ningún test.

## Decisiones
1. Dependencias aprobadas: `primeng@22`, `@primeuix/themes`, `primeicons`. `@angular/animations` solo si es imprescindible, y en ese caso parar y preguntar.
2. Preset: `primary` = paleta `indigo` de Aura. `surface`, radios y tipografía por defecto.
3. La preferencia se persiste en `localStorage` con clave `theme` (`'light'` | `'dark'`).
4. Sin valor guardado se respeta `prefers-color-scheme` al arrancar. No se reacciona en caliente a cambios del sistema.
5. Modo por defecto: según el sistema; claro como fallback.
6. Cabecera: texto "Facturas" a la izquierda y botón de tema a la derecha. Sin logo ni menú de usuario.
7. Login y registro irán fuera del layout, en una pantalla mínima (futuro; ahora no se crean).
8. `aria-label` "Activar modo oscuro" / "Activar modo claro", sin tooltip.
9. `ThemeToggle` inyecta `ThemeService` directamente.
10. `index.html`: `<title>Facturas</title>` y `lang="es"`.
11. Se evita el destello con un script inline en `index.html` que aplica `.app-dark` antes del bootstrap con la misma lógica (`localStorage['theme']` → `prefers-color-scheme` → claro).
