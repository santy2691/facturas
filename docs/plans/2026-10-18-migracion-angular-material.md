# Migración del frontend de PrimeNG 22 a Angular Material 22

**Estado: APROBADO por el usuario (2026-10-18).** Ver "Decisiones" al final.

## Objetivo
Sustituir PrimeNG 22, `@primeuix/themes` y PrimeIcons (licencia comercial
"PrimeUI License" desde la v22: pide clave y muestra "Invalid PrimeUI License")
por Angular Material 22.2 (MIT). La app debe verse y comportarse igual: tema con
primario indigo, modo claro/oscuro con `.app-dark`, mismos textos, mismas reglas
de formulario y los mismos tests (actualizados, nunca borrados).

## Ámbito
frontend (el backend no cambia; tampoco el contrato de la API)

## Estado actual (análisis)
- `package.json`: `primeng ^22.1.2`, `@primeuix/themes ^3.0.1`, `primeicons ^8.0.2`.
  `@angular/cdk 22.2.3` ya está en `node_modules` pero **solo como peer de PrimeNG**
  (no está en `dependencies`): al desinstalar PrimeNG podría desaparecer, así que
  hay que instalarlo explícitamente.
- `src/app/theme.ts`: `definePreset(Aura)` con `primary` = indigo 50…950.
- `app.config.ts`: `providePrimeNG({ theme: { preset: AppPreset, options: { darkModeSelector: '.app-dark' } } })`.
- `src/styles.scss`: `@use 'primeicons/primeicons.css'` y `body` con `--p-content-background` / `--p-text-color`.
  No hay `font-family` global (hoy la tipografía la ponen los componentes de PrimeNG).
- `index.html`: script inline anti-destello (`localStorage['theme']` → `prefers-color-scheme` → claro) que añade `.app-dark`. **No cambia** (solo se añade el `<link>` de iconos, decisión 1).
- `core/theme/theme.ts` (`Theme`): signals + `.app-dark` + `localStorage`. **No cambia**; `theme.spec.ts` tampoco.
- Usos de PrimeNG (imports, plantillas, SCSS `--p-*`, clases `pi`):
  | Fichero | Uso |
  |---|---|
  | `shared/theme-toggle/theme-toggle/theme-toggle.{ts,html,spec.ts}` | `p-button` texto/redondeado, `pi-moon`/`pi-sun`; spec busca `p-button button`, `.pi-moon`, `.pi-sun` |
  | `core/layout/main-layout/main-layout.{ts,html,scss}` | `p-toolbar` con `#start`/`#end`; SCSS `--p-*` |
  | `core/layout/auth-layout/auth-layout.scss` | `--p-*` |
  | `features/auth/login-form/login-form.{ts,html,scss,spec.ts}` | `p-card`, `pInputText`, `pInputPassword` + `p-iconfield`/`p-inputicon`, botón `.mask-toggle` con `pi-eye`/`pi-eye-slash`, `<small class="field-error">`, `p-message`, `p-button [loading] [fluid]`; spec busca `p-message` |
  | `features/auth/register-form/register-form.{ts,html,scss,spec.ts}` | igual que login, con 2 campos de contraseña y `errorOf()` (cliente o servidor); spec busca `p-message` y `label` |
  | `features/auth/register/register.spec.ts` (l. 83) | busca `p-message` |
  | `features/home/home/home.{ts,html,scss,spec.ts}` | `p-button` "Cerrar sesión", `pi-sign-out`, `severity="secondary"`, `[loading]`; spec busca `.p-button-loading…` y `.pi-sign-out` |
  | `app.config.ts`, `src/app/theme.ts`, `src/styles.scss` | configuración y tema |
  | `/.mcp.json` | único servidor: `primeng` (`npx -y @primeng/mcp`) |
  | `frontend/CLAUDE.md` | Stack, Diseño (MCP `primeng`, prohibición de Angular Material, `theme.ts`, `--p-*`, `p-table`, PrimeIcons) |
- Root `CLAUDE.md`, sección Stack: solo dice "Angular 22 (…), SCSS"; no menciona librería de UI.
- Agentes en `.claude/agents/`: no mencionan PrimeNG (comprobado con grep).
- Planes históricos con PrimeNG: `docs/plans/2026-10-18-primeng-tema-layout.md` y `docs/plans/2026-10-18-auth-registro-login.md`.
- Budgets (producción): `initial` 1 MB warning / 1.5 MB error; `anyComponentStyle` 4 kB / 8 kB.
  Las rutas `inicio`, `login` y `registro` son lazy (`loadComponent`); los layouts y el toggle van en el bundle inicial.

### Signal Forms + Material (investigado en `node_modules/@angular/forms@22.2.3`)
En `fesm2022/signals.mjs` la directiva `FormField` (`[formField]`) **provee `NgControl`**
mediante `InteropNgControl` (líneas ~710-772 y ~1449-1460). Ese objeto expone
`invalid`, `touched`, `dirty`, `errors`, `disabled`, `status` y
`hasValidator(Validators.required)` → `field().required()`.
Consecuencias para `matInput` (que inyecta `NgControl` opcional en el propio elemento):
- `errorState` funciona con el `ErrorStateMatcher` por defecto
  (`control.invalid && (control.touched || form?.submitted)`). Como no usamos
  `NgForm`/`FormGroupDirective`, la regla efectiva es `invalid && touched`, que es
  **la misma que hoy** (`touched() && errors()[0]`). El submit ya hace `markAsTouched()`.
- `required` (asterisco del label y `aria-required`) se deduce del validador `required()`.
- `mat-error` solo se proyecta cuando `errorState` es `true`; si no, no está en el DOM.
- `aria-invalid` y `aria-describedby` (enlazando el `mat-error`) los pone `matInput`.
- Limitación: los **errores del servidor** de `register-form` (`fieldErrors`) no están en
  el `FieldState`, así que el matcher por defecto no los vería → hace falta un
  `errorStateMatcher` propio en esos campos (ver paso 10).
- Material no está instalado todavía, así que no he podido ver si la 22.2 añade soporte
  nativo adicional (p. ej. vía `ɵFORM_CONTROL_INTEGRATION`). Se comprueba en el paso 1;
  el plan funciona igual con la interop de `NgControl`.

## Decisiones técnicas
- **Instalación manual** (`npm install`) en vez de `ng add` (decisión 11). Motivo: `ng add @angular/material`
  pregunta tema y tipografía y reescribe `styles.scss` e `index.html` (añade `<link>` de
  Google Fonts para Roboto y la fuente de iconos y la clase `mat-typography` en `<body>`);
  queremos controlar cada uno de esos cambios. Desde Material 20 no hace falta
  `@angular/animations` ni `provideAnimations*()` (usa animaciones CSS); si al instalar
  npm o la build lo pidieran, **PARAR y preguntar**.
- **Tema en SCSS, única fuente de verdad**: `src/styles/_theme-colors.scss` (paletas
  generadas) + el bloque `mat.theme()` de `src/styles.scss`. Se borra `src/app/theme.ts`.
  Material 22 no tiene paleta indigo predefinida (las M3 son red, green, blue, yellow,
  cyan, magenta, orange, chartreuse, spring-green, azure, violet, rose), así que se genera
  una con el schematic `ng generate @angular/material:theme-color` a partir de `#6366F1` (decisión 3).
- **Modo oscuro con `light-dark()`**: `mat.theme()` con `theme-type: color-scheme` emite los
  `--mat-sys-*` como `light-dark(<claro>, <oscuro>)`; el modo se elige con la propiedad CSS
  `color-scheme`. Se conserva todo lo actual:
  ```scss
  html {
    color-scheme: light;
    @include mat.theme((
      color: (primary: app.$primary-palette, tertiary: app.$tertiary-palette, theme-type: color-scheme),
      typography: (plain-family: $system-font, brand-family: $system-font),
      density: 0,
    ));
    &.app-dark { color-scheme: dark; }
  }
  ```
  con `$system-font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;` (decisión 2).
  El script anti-destello añade `.app-dark` antes de que cargue la hoja de estilos, así
  que no hay destello. `Theme`, `localStorage['theme']` y `prefers-color-scheme` no cambian.
  No se añade `<meta name="color-scheme">` (pintaría el fondo del sistema antes del CSS y
  podría contradecir la preferencia guardada).
- **Tokens**: estilos propios solo con `var(--mat-sys-*)`. Equivalencias:
  | Antes | Después |
  |---|---|
  | `--p-content-background` | `--mat-sys-surface` |
  | `--p-text-color` | `--mat-sys-on-surface` |
  | `--p-text-muted-color` | `--mat-sys-on-surface-variant` |
  | `--p-primary-color` | `--mat-sys-primary` |
  | `--p-content-border-color` | `--mat-sys-outline-variant` |
  | `--p-red-500` (`.field-error`) | desaparece: lo pinta `mat-error` (`--mat-sys-error`) |
  Personalizaciones de componentes, si hacen falta, con los mixins `mat.<componente>-overrides(...)`
  en `styles.scss` (no en el SCSS del componente: el budget `anyComponentStyle` es de 4 kB).
- **Iconos**: `mat-icon` con ligaduras de **Material Symbols Outlined** (Apache 2.0), cargada desde
  Google Fonts por CDN con subconjunto (decisión 1), y
  `{ provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-symbols-outlined' } }`
  en `app.config.ts` (por defecto `mat-icon` usa la clase `material-icons`, la fuente antigua). Equivalencias:
  | PrimeIcons | Material Symbols |
  |---|---|
  | `pi-moon` | `dark_mode` |
  | `pi-sun` | `light_mode` |
  | `pi-eye` | `visibility` |
  | `pi-eye-slash` | `visibility_off` |
  | `pi-sign-out` | `logout` |
  | (icono de `p-message` error) | `error` |
- **Componentes**:
  - Toolbar: `<mat-toolbar>` con `<span class="title">Facturas</span>`, un espaciador
    (`flex: 1 1 auto`) y `<app-theme-toggle />`.
  - Card: `<mat-card appearance="outlined">` + `<mat-card-header><mat-card-title>…</mat-card-title></mat-card-header>` + `<mat-card-content>`.
  - Campos: `<mat-form-field>` (variante `outline`, decisión 5) + `<mat-label>` + `<input matInput id="…" [formField]="…">` + `<mat-error>`.
    El `id` se mantiene en el `<input>` (los tests lo usan) y `mat-form-field` enlaza el label con él.
  - Contraseña: `[type]="masked() ? 'password' : 'text'"` en el `<input matInput>` y
    `<button matIconButton matSuffix type="button" class="mask-toggle" [attr.aria-label]="…">`
    con `<mat-icon>`. Se mantiene la clase `.mask-toggle` como gancho de test; sus estilos
    propios se borran (los pone Material).
  - Error del servidor (decisión 6): Material no tiene componente de mensaje/alerta en línea (solo
    `MatSnackBar`, que es transitorio y fuera del formulario). Bloque propio mínimo dentro del formulario,
    encima del botón: `<div class="server-error" role="alert"><mat-icon>error</mat-icon><span>{{ message }}</span></div>`
    con `--mat-sys-error-container` / `--mat-sys-on-error-container` / `--mat-sys-corner-small`.
  - Botones: API unificada de Material 20+: `matButton="filled"` (principal),
    `matButton="tonal"` (equivalente a `severity="secondary"`, decisión 7), `matIconButton` (solo icono).
    Ancho completo (`[fluid]`) con CSS `width: 100%`.
  - Estado de carga (Material no tiene `loading`): en el propio botón,
    `[disabled]="loading()"` + `disabledInteractive` (sigue siendo enfocable y no se pierde el
    foco al enviar) + `[attr.aria-busy]="loading()"` y, mientras carga,
    `<mat-progress-spinner mode="indeterminate" diameter="18" aria-hidden="true" />` en lugar del
    icono (o delante del texto). El texto del botón no cambia. La guarda `if (this.loading()) return;`
    de los componentes se mantiene (con `disabledInteractive` el `submit` por Enter sigue llegando).
    No se crea un componente "botón con carga" compartido (son 3 usos; YAGNI).
- **Valores por defecto de los campos** en `app.config.ts` con `MAT_FORM_FIELD_DEFAULT_OPTIONS`:
  `{ appearance: 'outline', subscriptSizing: 'dynamic', hideRequiredMarker: true }` (decisiones 5 y 8).
- **Tests**: se usan los harnesses de Material (`@angular/cdk/testing` + `@angular/material/*/testing`,
  incluidos en los paquetes, no son dependencia nueva) donde sustituyen selectores de PrimeNG:
  `MatButtonHarness`, `MatIconHarness`, `MatFormFieldHarness.getTextErrors()`,
  `MatProgressSpinnerHarness`. Los helpers actuales de escritura (`input`+`blur` sobre `#id`) se
  mantienen porque siguen funcionando y no dependen de PrimeNG.

## Criterios de aceptación
- Dado el repo, cuando se busca `primeng`, `primeuix`, `primeicons`, `providePrimeNG`, `--p-`,
  `class="pi`, `'pi pi-`, `p-button`, `p-card`, `p-message`, `p-toolbar`, `p-iconfield`,
  `p-inputicon`, `pInputText`, `pInputPassword` en `frontend/src`, `frontend/package.json`,
  `frontend/package-lock.json`, `frontend/angular.json`, `.mcp.json` y los `CLAUDE.md`, entonces no hay
  ninguna coincidencia (los planes históricos quedan fuera; decisión 10).
- Dado `package.json`, entonces contiene `@angular/material` y `@angular/cdk` `^22.2.x` (misma versión
  entre ellos y compatible con `@angular/core` 22.2) y no contiene `primeng`, `@primeuix/themes` ni
  `primeicons`; no se ha añadido ninguna otra dependencia; `npm ls @angular/material @angular/cdk` no da errores de peer.
- Dada la app arrancada, cuando se carga cualquier pantalla, entonces no aparece el aviso
  "Invalid PrimeUI License" ni errores en consola.
- Dado `npm test`, entonces pasan todos los tests y hay **al menos 95** (ninguno borrado ni
  desactivado; `it.skip`/`xit`/`describe.skip` prohibidos).
- Dado `npm run build`, entonces compila sin errores y el bundle inicial queda **por debajo de 1 MB**
  (sin warning de budget); se anota en el PR el tamaño antes y después.
- Tema:
  - Dado el modo claro, cuando se inspecciona `--mat-sys-primary` en `<html>`, entonces es el tono generado
    a partir de `#6366F1`; en `styles.scss` no hay colores fijos fuera de `_theme-colors.scss`.
  - La tipografía es la pila del sistema; no se descarga ninguna fuente de texto.
  - Dado el modo claro, cuando se pulsa el botón de tema, entonces `<html>` recibe `app-dark`,
    `color-scheme` computado pasa a `dark`, se guarda `'dark'` en `localStorage['theme']` y todos los
    componentes (toolbar, card, campos, botones, mensaje de error) se ven en oscuro. Al volver a
    pulsar, se revierte y se guarda `'light'`.
  - Dado `localStorage['theme'] = 'dark'`, cuando se recarga, entonces arranca en oscuro sin destello claro.
  - Dado que no hay valor guardado y el sistema está en oscuro, cuando se carga, entonces arranca en oscuro;
    con sistema claro o sin preferencia, en claro. Un cambio del sistema con la app abierta no la cambia.
  - Si `localStorage` lanza o tiene un valor distinto de `'light'`/`'dark'`, se aplica la regla del sistema sin errores.
- Iconos: se cargan desde Google Fonts con el subconjunto de 6 iconos; mientras carga la fuente no se ve
  el texto de la ligadura (`display=block`).
- Botón de tema: en claro muestra el icono `dark_mode` y `aria-label="Activar modo oscuro"`; en oscuro
  `light_mode` y `aria-label="Activar modo claro"`; el clic llama a `Theme.toggle()`; sin tooltip.
- Layout principal: `mat-toolbar` con "Facturas" a la izquierda y el botón de tema a la derecha; debajo `<main>` con `router-outlet`.
- Layout de autenticación: "Facturas" encima de la tarjeta centrada y el botón de tema en la esquina superior derecha.
- Campos: variante `outline`, sin asterisco de obligatorio en ninguno.
- Login:
  - Tarjeta con título "Iniciar sesión"; labels "Email" y "Contraseña".
  - Al enviar vacío: "El email es obligatorio" y "La contraseña es obligatoria" en `mat-error`, los campos
    en estado de error (`aria-invalid="true"`) y no se emite nada.
  - Email con formato inválido tras salir del campo: "Introduce un email válido".
  - El botón del ojo alterna `type` `password`↔`text`, su `aria-label` "Mostrar contraseña"↔"Ocultar contraseña"
    y el icono `visibility`↔`visibility_off`. No envía el formulario.
  - Datos válidos: emite `{ email, password }` con el email tal cual se escribió.
  - Con `serverError` (p. ej. "Email o contraseña incorrectos") se muestra en un elemento `role="alert"`
    encima del botón, con el icono `error`.
  - Con `loading = true`: el botón "Iniciar sesión" muestra un spinner, tiene `aria-busy="true"`, está
    deshabilitado (`aria-disabled`) y no se emite aunque se envíe el formulario.
  - Enlace "Regístrate" → `/registro`.
- Registro:
  - Título "Crear cuenta"; labels en orden: Nombre, Apellidos, Email, Contraseña, Confirmar contraseña.
  - Se conservan **todos** los mensajes y reglas actuales (nombres con solo espacios, 75/76 caracteres,
    email 254/255, regla de contraseña, 64/65, "Las contraseñas no coinciden", "Confirma la contraseña").
  - Los errores de servidor por campo (`fieldErrors`) se muestran en el `mat-error` de su campo y ese
    campo queda en estado de error aunque no se haya tocado.
  - Error general (409, "Ya existe una cuenta con este email") en el elemento `role="alert"`.
  - Dos botones de ojo independientes, con los mismos textos que en login.
  - Botón "Crear cuenta" con el mismo estado de carga que login. Enlace "Inicia sesión" → `/login`.
- Inicio: "Hola, <nombre>"; botón "Cerrar sesión" (`matButton="tonal"`) con icono `logout`; al pulsarlo
  muestra spinner hasta que termina la petición y navega a `/login` también si falla.
- Accesibilidad: se mantienen todos los `aria-label` actuales y los textos en español; `mat-icon`
  decorativos con `aria-hidden="true"` (por defecto en Material); `aria-required` se mantiene aunque se
  oculte el asterisco; contraste correcto en ambos modos.
- `.mcp.json` queda como `{ "mcpServers": {} }`.
- `frontend/CLAUDE.md` y `CLAUDE.md` raíz actualizados (ver paso 13).

## Pasos — frontend

> Cada paso termina con `cd frontend && npm test` en verde (y `npm run build` cuando se indique).
> Durante los pasos 2-11 conviven PrimeNG y Material; PrimeNG se elimina en el paso 12.
> Documentación de referencia: https://material.angular.dev (Theming, Icon, Form field, Input,
> Button, Card, Toolbar, Progress spinner, Testing with harnesses).

0. [x] **Línea base.**
   `npm test` (anotar nº de tests: 95) y `npm run build` (anotar el tamaño "Initial total" y los chunks lazy).
   Verificación: ambos en verde; cifras copiadas para el PR.

1. [x] **Instalar Angular Material y CDK (decisión 11: manual).**
   `cd frontend && npm install @angular/material@^22.2.3 @angular/cdk@^22.2.3`
   (misma versión que la `@angular/cdk` ya presente y compatible con `@angular/core ^22.2.0`;
   si npm resuelve otra 22.2.x, que sean iguales entre sí). Sin `--force` ni `--legacy-peer-deps`.
   Si se pide alguna otra dependencia (p. ej. `@angular/animations`), PARAR y preguntar.
   Comprobar en `node_modules/@angular/material/fesm2022/input.mjs` (o el fichero equivalente) si hay
   soporte nativo de Signal Forms (`ɵFORM_CONTROL_INTEGRATION`, `FORM_FIELD`) además de `NgControl`, y
   anotar el resultado en el PR.
   Ficheros: `frontend/package.json`, `frontend/package-lock.json`.
   Verificación: `npm ls @angular/material @angular/cdk` sin errores; `npm run build` pasa.

2. [x] **Generar la paleta indigo (decisión 3).**
   `npx ng generate @angular/material:theme-color` con primario `#6366F1`, el terciario por defecto del
   schematic y directorio `src/styles/`. Revisar que genera `src/styles/_theme-colors.scss` con
   `$primary-palette` y `$tertiary-palette` (nombres según la versión instalada).
   Verificación: el fichero existe; `npm run build` pasa.

3. [x] **Tema M3 global en `src/styles.scss` (decisiones 2, 3 y 4).**
   - `@use '@angular/material' as mat;` y `@use './styles/theme-colors' as app;`.
   - `$system-font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;`.
   - En `html`: `color-scheme: light;` + `@include mat.theme((color: (primary: app.$primary-palette, tertiary: app.$tertiary-palette, theme-type: color-scheme), typography: (plain-family: $system-font, brand-family: $system-font), density: 0));` y `&.app-dark { color-scheme: dark; }`.
   - `body`: `margin: 0; background: var(--mat-sys-surface); color: var(--mat-sys-on-surface); font: var(--mat-sys-body-medium);`.
   - De momento se mantiene `@use 'primeicons/primeicons.css'` (se quita en el paso 12).
   Ficheros: `frontend/src/styles.scss`.
   Verificación: `npm run build`; con `npm start`, en DevTools existen `--mat-sys-*` en `<html>`,
   `--mat-sys-primary` es indigo y al alternar el tema `color-scheme` cambia y los `--mat-sys-*` resuelven
   al valor oscuro. En la pestaña Red no se descarga ninguna fuente de texto. `npm test` sigue en verde.

4. [x] **Fuente de iconos (decisión 1: Google Fonts por CDN con subconjunto).**
   - En `index.html`, **después** del script anti-destello:
     `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=dark_mode,error,light_mode,logout,visibility,visibility_off&display=block">`
     (los nombres de `icon_names` van en orden alfabético; al añadir un icono nuevo hay que ampliar la lista).
   - En `app.config.ts`: `{ provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-symbols-outlined' } }`.
   Ficheros: `frontend/src/index.html`, `frontend/src/app/app.config.ts`.
   Verificación: `npm run build`; `app.config.spec.ts` pasa; un `<mat-icon>dark_mode</mat-icon>` se ve como icono.

5. [x] **Valores por defecto de `mat-form-field` (decisiones 5 y 8).**
   En `app.config.ts`: `{ provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline', subscriptSizing: 'dynamic', hideRequiredMarker: true } }`.
   `subscriptSizing: 'dynamic'` reproduce el comportamiento actual (el error aparece debajo y desplaza el contenido).
   Ficheros: `frontend/src/app/app.config.ts`.
   Verificación: `npm test` (`app.config.spec.ts`) en verde.

6. [x] **`ThemeToggle` con `matIconButton` + `mat-icon`.**
   Plantilla: `<button matIconButton type="button" [attr.aria-label]="…" (click)="theme.toggle()"><mat-icon>{{ theme.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon></button>`.
   Imports: `MatButtonModule` (o `MatIconButton`), `MatIconModule`. OnPush se mantiene.
   Spec (mismos 4 tests, adaptados con harnesses):
   - "renders a p-button" → "renders an icon button" (`MatButtonHarness` existe, `getVariant()` = `'icon'`).
   - "calls toggle on click" → `await button.click()`.
   - Modo claro: `aria-label` "Activar modo oscuro" y `MatIconHarness.getName()` = `'dark_mode'`.
   - Modo oscuro: "Activar modo claro" y `'light_mode'`.
   Ficheros: `theme-toggle.ts`, `theme-toggle.html`, `theme-toggle.spec.ts`.
   Verificación: `npm test`. Si `TestbedHarnessEnvironment` diera problemas con Vitest/zoneless, usar
   selectores DOM (`button[matIconButton]`, texto de `mat-icon`) y anotarlo en el PR.

7. [x] **`MainLayout` con `mat-toolbar`.**
   Plantilla: `<mat-toolbar class="header"><span class="title">Facturas</span><span class="spacer"></span><app-theme-toggle /></mat-toolbar>` + `<main class="content"><router-outlet /></main>`.
   SCSS: borde `var(--mat-sys-outline-variant)`; quitar `background`/`color` del header si los pone el toolbar
   (si no casa con el diseño, usar `mat.toolbar-overrides` en `styles.scss`); `.title` con
   `font: var(--mat-sys-title-large)`; `.content` con `--mat-sys-surface` / `--mat-sys-on-surface`.
   Ficheros: `main-layout.ts`, `main-layout.html`, `main-layout.scss`. Spec sin cambios (no depende de PrimeNG).
   Verificación: `npm test`; visual en ambos modos.

8. [x] **`AuthLayout`: solo tokens.**
   Sustituir `--p-*` por `--mat-sys-*` en `auth-layout.scss` (`.brand` con `font: var(--mat-sys-headline-small)` o el tamaño actual).
   Ficheros: `auth-layout.scss`. Spec sin cambios.
   Verificación: `npm test`; visual.

9. [x] **`LoginForm` con Material.**
   - Imports: `FormField`, `RouterLink`, `MatCardModule`, `MatFormFieldModule`, `MatInputModule`,
     `MatButtonModule`, `MatIconModule`, `MatProgressSpinnerModule`. Fuera todos los módulos de PrimeNG.
   - Plantilla: `mat-card` con título "Iniciar sesión"; dos `mat-form-field`:
     - Email: `<mat-label>Email</mat-label><input matInput id="login-email" type="email" autocomplete="email" [formField]="loginForm.email" /><mat-error>{{ loginForm.email().errors()[0]?.message }}</mat-error>`.
     - Contraseña: `<input matInput id="login-password" autocomplete="current-password" [type]="passwordMasked() ? 'password' : 'text'" [formField]="loginForm.password" />` + botón `.mask-toggle` `matIconButton matSuffix` con `visibility`/`visibility_off` + `mat-error`.
     - Errores con el `ErrorStateMatcher` por defecto (misma regla que hoy).
   - Error de servidor: bloque `role="alert"` con icono `error`, encima del botón (decisión 6).
   - Botón: `matButton="filled" type="submit" class="submit"` con el patrón de carga de "Decisiones técnicas".
   - SCSS: quitar `.field-error` y `.mask-toggle`; `.switch` con `--mat-sys-on-surface-variant`, enlace con
     `--mat-sys-primary`; `.submit { width: 100%; }`; estilos de `.server-error`; `.field`/`mat-form-field` a ancho completo.
   - `passwordMasked` sigue siendo una `signal`; desaparece `[(mask)]`.
   Spec (8 tests actuales, ninguno eliminado):
   - "shows the server error": `[role="alert"]` en lugar de `p-message`.
   - "toggles the password mask": añadir comprobación del icono (`visibility` → `visibility_off`).
   - "shows required errors on submit": además, `MatFormFieldHarness.getTextErrors()` de cada campo y `aria-invalid="true"` en los inputs.
   - "does not emit while loading": además, el botón tiene `aria-busy="true"` y hay un `mat-progress-spinner` (o `MatProgressSpinnerHarness`).
   - Resto sin cambios.
   Ficheros: `login-form.ts`, `login-form.html`, `login-form.scss`, `login-form.spec.ts`.
   Verificación: `npm test`; `login.spec.ts` sigue en verde (no usa selectores de PrimeNG).

10. [x] **`RegisterForm` con Material.**
    - Igual que login para los 5 campos (`register-firstName`, `-lastName`, `-email`, `-password`,
      `-confirmPassword`; mismos `autocomplete`), dos `signal` de máscara independientes.
    - `mat-error` con `{{ errorOf('<campo>') }}`.
    - **Matcher propio** para que los errores de servidor pongan el campo en error:
      un objeto por campo, p. ej. `protected readonly matchers = { firstName: this.matcherFor('firstName'), … }`
      con `matcherFor(name) => ({ isErrorState: () => this.errorOf(name) !== null })`, y en cada input
      `[errorStateMatcher]="matchers.firstName"`. Así cliente y servidor siguen la misma regla que hoy (`errorOf`).
    - Error general: bloque `role="alert"`. Botón "Crear cuenta" con estado de carga.
    - SCSS como en login.
    Spec (12 tests actuales, ninguno eliminado):
    - "shows the title and labels in order": comprobar que sigue pasando con los `<label>` que genera
      `mat-form-field`; si el `textContent` cambiara, leer los `mat-label`. No cambiar el orden ni los textos esperados.
    - "shows server field errors next to their field": además, `MatFormFieldHarness` de Apellidos y Contraseña
      con ese texto en `getTextErrors()` y el input con `aria-invalid="true"` sin haberlo tocado.
    - "shows the general server error in a message": `[role="alert"]` en lugar de `p-message`.
    - Nuevo: "toggles each password mask independently" (los dos botones `.mask-toggle`).
    - Resto sin cambios.
    `register.spec.ts` (l. 83): `querySelector('[role="alert"]')` en lugar de `p-message`.
    Ficheros: `register-form.ts`, `register-form.html`, `register-form.scss`, `register-form.spec.ts`, `features/auth/register/register.spec.ts`.
    Verificación: `npm test`.

11. [x] **`Home` con Material (decisión 7).**
    `<button matButton="tonal" type="button" [disabled]="loggingOut()" disabledInteractive [attr.aria-busy]="loggingOut()" (click)="logout()">`
    con `<mat-icon>logout</mat-icon>` (o el spinner mientras `loggingOut()`) y el texto "Cerrar sesión".
    SCSS: `--p-text-color` → `--mat-sys-on-surface`.
    Spec (4 tests): "logs out and navigates": el indicador de carga pasa a ser `mat-progress-spinner` dentro del
    botón y `aria-busy="true"`; "has the sign-out button with its icon": `MatIconHarness.getName()` = `'logout'`
    (en lugar de `.pi-sign-out`). Comprobar que `querySelector('button')` sigue encontrando ese botón.
    Ficheros: `home.ts`, `home.html`, `home.scss`, `home.spec.ts`.
    Verificación: `npm test`.

12. [x] **Eliminar PrimeNG y comprobar que no quedan restos.**
    - `app.config.ts`: quitar `providePrimeNG` y el import de `./theme`.
    - Borrar `frontend/src/app/theme.ts`.
    - `styles.scss`: quitar `@use 'primeicons/primeicons.css'`.
    - `npm uninstall primeng @primeuix/themes primeicons`.
    - `.mcp.json`: dejarlo como `{ "mcpServers": {} }` (decisión 9).
    - Grep sin resultados en `frontend/src`, `frontend/package*.json`, `frontend/angular.json`, `.mcp.json`:
      `primeng|primeuix|primeicons|providePrimeNG|--p-|\bpi-|"pi |p-button|p-card|p-message|p-toolbar|p-iconfield|p-inputicon|pInputText|pInputPassword|AppPreset`.
    - `npm ls @angular/cdk` sigue mostrándola como dependencia directa.
    Verificación: `npm test` (≥ 95 tests), `npm run build` y el grep vacío.

13. [x] **Actualizar los CLAUDE.md.**
    - `frontend/CLAUDE.md`, sección **Stack**: "UI: Angular Material 22 (tema M3 en SCSS) + Material Symbols (`mat-icon`)".
    - **Diseño** (sustituir entera):
      - Usar siempre un componente de Angular Material antes de crear uno propio. Consultar API y ejemplos en https://material.angular.dev.
      - Una sola librería de componentes (Angular Material + CDK); no añadir otras.
      - El tema se define en `src/styles.scss` con `mat.theme()` y las paletas de `src/styles/_theme-colors.scss`
        (generadas con `ng generate @angular/material:theme-color` desde `#6366F1`): colores, tipografía (pila del
        sistema) y densidad (0) se cambian AHÍ. Personalizar componentes con los mixins `mat.<componente>-overrides()` en `styles.scss`.
      - Estilos propios solo con los tokens `var(--mat-sys-*)` (`--mat-sys-surface`, `--mat-sys-on-surface`,
        `--mat-sys-primary`…). Nunca colores fijos.
      - Modo oscuro con `color-scheme` + `light-dark()`: `.app-dark` en `<html>` pone `color-scheme: dark`;
        todo debe verse bien en ambos modos.
      - Formularios: `mat-form-field` (outline, sin asterisco) + `matInput` + `[formField]`; errores en `mat-error`;
        si el error no está en el `FieldState` (p. ej. del servidor), usar `errorStateMatcher`.
      - Errores generales del servidor en un bloque `role="alert"` con `--mat-sys-error-container`.
      - Botones con carga: `[disabled]` + `disabledInteractive` + `aria-busy` + `mat-progress-spinner`.
      - Tablas con `mat-table` + `mat-paginator` + `matSort`: paginación, orden y filtros en servidor; textos del
        paginador en español con `MatPaginatorIntl`.
      - Iconos solo con `mat-icon` y Material Symbols Outlined, cargada desde Google Fonts con subconjunto
        (`icon_names` en `index.html`): al usar un icono nuevo, añadirlo a la lista en orden alfabético.
        Pendiente para producción: autoalojar la fuente (ver decisión 1 del plan de migración).
    - **Tests**: añadir "Para componentes de Material, preferir los harnesses (`@angular/cdk/testing`,
      `@angular/material/*/testing`) a selectores internos del DOM".
    - Quitar la línea del MCP `primeng` y la prohibición de Angular Material.
    - `CLAUDE.md` raíz, sección **Stack**: "Frontend: Angular 22 (standalone, signals, OnPush por defecto), SCSS, Angular Material 22 (tema M3) y Material Symbols".
    Verificación: grep de `PrimeNG|primeng|PrimeIcons|--p-|Material` en ambos ficheros muestra solo lo nuevo.

14. [x] **Verificación final y bundle.** (96 tests, build OK, initial 496.81 kB; verificación en Chrome headless con backend real el 2026-10-18: flujo completo, tema, sin destello, móvil, sin peticiones externas)
    - `npm test` y `npm run build` en verde; comparar "Initial total" con la línea base (paso 0). Debe quedar < 1 MB.
      Si se acerca: comprobar que solo se importan los módulos usados y que el tema se incluye una sola vez
      (`mat.theme` solo en `styles.scss`). No subir el budget sin preguntar.
    - Manual (`npm start` con backend): login, registro (errores de cliente, 400 por campo, 409), inicio y logout;
      alternar tema y recargar (sin destello); borrar `localStorage.theme` y comprobar que sigue al sistema;
      navegación con teclado (Tab por campos, ojo y botón), lector de pantalla anuncia el error de servidor;
      ningún aviso de licencia en consola; ambos modos se ven bien.
    - Documentar en el PR: tamaños, resultado del paso 1 sobre Signal Forms y cualquier desviación.

15. [x] **Planes históricos (decisión 10).**
    Añadir al principio de `docs/plans/2026-10-18-primeng-tema-layout.md` y `docs/plans/2026-10-18-auth-registro-login.md`,
    debajo del título, la línea: "Nota (2026-10-18): PrimeNG sustituido por Angular Material; ver `2026-10-18-migracion-angular-material.md`".
    No se modifica nada más de esos planes.
    Verificación: `git diff` de esos ficheros muestra solo esa línea.

## Tareas pendientes para producción (fuera de este plan)
- [x] (2026-10-18, hecho: `public/fonts/material-symbols-outlined.woff2` + `material-symbols-LICENSE.txt`,
  `@font-face` en `styles.scss`, `<link rel="preload">` en `index.html`; receta para regenerar en `frontend/CLAUDE.md`)
  **Autoalojar Material Symbols** antes de salir a producción si va a haber usuarios en la UE: descargar el
  `woff2` del mismo subconjunto de Google Fonts a `frontend/public/fonts/` con su `LICENSE` (Apache 2.0),
  declarar el `@font-face` en `styles.scss` y quitar el `<link>` de `index.html`. Así se evita la petición a
  terceros (riesgo de RGPD) sin añadir dependencias.

## Riesgos
- **Cambio de regla del `frontend/CLAUDE.md`**: hoy prohíbe Angular Material y obliga a usar el MCP `primeng`.
  El plan la cambia porque es una decisión explícita del usuario (licencia); se actualiza el CLAUDE.md en el mismo PR.
- **Signal Forms + `matInput`**: funciona vía `InteropNgControl` (comprobado en `@angular/forms`), pero
  `errorState` se recalcula en `ngDoCheck`. Con OnPush/zoneless depende de que la vista se refresque cuando
  cambian `touched`/`errors`; las plantillas leen esas signals dentro de `mat-error`, así que debería refrescar.
  Lo cubren los tests de los pasos 9 y 10 (estado de error tras submit y con errores de servidor sin tocar el campo).
- **Cambio dinámico de `type`** en un `<input>` con `[formField]` + `matInput`: password↔text son ambos
  textuales; lo cubre el test del ojo.
- **`light-dark()`** requiere navegadores recientes (Chrome/Edge 123+, Firefox 120+, Safari 17.5+). En navegadores
  más antiguos el tema no se aplicaría bien. Alternativa si hiciera falta: `theme-type: light` en `html` y
  `theme-type: dark` en `html.app-dark` (duplica el CSS de color).
- **Iconos por CDN de Google**: petición a terceros (IP del usuario). En la UE hay precedentes que lo consideran
  incompatible con el RGPD sin consentimiento (LG München, 2022). Aceptado para desarrollo; queda como tarea
  pendiente para producción (autoalojar).
- **Subconjunto de iconos**: un icono que no esté en `icon_names` se verá como texto. Se documenta en el CLAUDE.md
  que hay que ampliar la lista.
- **Licencias de fuentes**: Material Symbols es Apache 2.0; abierta y compatible con uso comercial. No se descarga
  ninguna fuente de texto (pila del sistema).
- **FOUT de ligaduras**: mientras carga la fuente se podría ver el texto `dark_mode`; mitigado con `display=block`.
- **Bundle inicial**: los estilos de los componentes de Material van en el JS de cada componente. Toolbar, botón e
  icono están en el bundle inicial; card, form-field, input y spinner en los chunks lazy. Se mide en los pasos 0 y 14.
- **Convivencia temporal** (pasos 2-11): las dos librerías cargadas a la vez; puede haber diferencias visuales
  intermedias. No se fusiona hasta completar el paso 12.
- **Harnesses con Vitest + zoneless**: `TestbedHarnessEnvironment` debería funcionar; si no, se usan selectores DOM
  estables (atributos `matButton`, `role`, `id`, texto del `mat-icon`).
- **Mensaje de error del servidor propio**: Material no ofrece un componente equivalente a `p-message`; el bloque
  `role="alert"` es marcado mínimo, no un componente nuevo, así que no contradice "usar antes un componente de la librería".
- **`@angular/cdk` como peer de PrimeNG**: si se desinstalara PrimeNG antes de instalarlo explícitamente, desaparecería; por eso el paso 1 va antes del 12.

## Decisiones
Aprobadas por el usuario el 2026-10-18.

1. **Fuente de iconos**: Material Symbols Outlined (Apache 2.0) desde **Google Fonts por CDN con subconjunto**:
   `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=dark_mode,error,light_mode,logout,visibility,visibility_off&display=block`.
   Sin dependencias nuevas y con poco peso; la lista `icon_names` (orden alfabético) se amplía al añadir iconos.
   El **autoalojamiento** del subconjunto en `public/fonts/` queda anotado como tarea para producción
   (ver "Tareas pendientes para producción"). Descartado el paquete npm `material-symbols` (dependencia nueva y varios MB).
2. **Tipografía**: pila del sistema (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`) en
   `typography: (plain-family: …, brand-family: …)` de `mat.theme`. No se descarga ninguna fuente.
3. **Paleta primaria**: generada con `ng generate @angular/material:theme-color` desde `#6366F1` (indigo-500 de Aura),
   con el terciario que proponga el schematic por defecto. Resultado en `src/styles/_theme-colors.scss`.
4. **Densidad**: `0`.
5. **Variante de `mat-form-field`**: `outline`, global vía `MAT_FORM_FIELD_DEFAULT_OPTIONS`, con `subscriptSizing: 'dynamic'`.
6. **Error del servidor**: bloque propio `role="alert"` dentro del formulario, encima del botón, con icono `error` y
   tokens `--mat-sys-error-container` / `--mat-sys-on-error-container`. Sin `MatSnackBar`.
7. **Botón "Cerrar sesión"**: `matButton="tonal"`.
8. **Asterisco de obligatorios**: oculto globalmente (`hideRequiredMarker: true`); `aria-required` se mantiene.
9. **`.mcp.json`**: se quita la entrada `primeng` y queda `{ "mcpServers": {} }`. Un MCP de Angular CLI se decidiría aparte.
10. **Planes históricos**: no se reescriben; se añade al principio una nota que apunta a este plan (paso 15).
11. **Instalación**: manual con `npm install` (paso 1), sin `ng add`.
