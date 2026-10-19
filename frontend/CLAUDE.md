# Frontend

Aplicación web en Angular que consume la API del backend. Ver el CLAUDE.md
raíz para contexto, autenticación y reglas entre aplicaciones.

## Stack
- Angular 22, TypeScript, SCSS
- UI: Angular Material 22 (tema M3 en SCSS) + Material Symbols (`mat-icon`)
- Componentes standalone, signals, OnPush por defecto

## Comandos
- Arrancar: `npm start` → http://localhost:4200
- Tests: `npm test`
- Build: `npm run build`
- Generar código: siempre con `npx ng generate ...`, no a mano, para seguir
  las convenciones de Angular 22.

## Estructura
src/app/
├── core/       → servicios globales, interceptores, guards
├── shared/     → componentes, pipes y directivas reutilizables
└── features/   → una carpeta por funcionalidad (auth/, home/; en el futuro groups/, expenses/)

## Navegación
- Módulos de primer nivel (Inicio, Grupos) como pestañas en la barra superior; en móvil, botón de
  menú que despliega la lista bajo la barra.
- Secciones de un grupo (Gastos, Miembros) como pestañas dentro del detalle del grupo, con la ruta
  "Grupos / <nombre>" encima del título. Los gastos solo existen bajo un grupo
  (p. ej. `/grupos/:id/gastos`), nunca como ruta de primer nivel.
- Módulos y secciones se declaran en una lista (etiqueta y ruta; sin ruta = no disponible); los no disponibles se
  pintan desactivados con "Próximamente". Añadir un módulo = añadir una entrada a la lista.

## Convenciones
- Angular moderno: nada de NgModules, `*ngIf`/`*ngFor` ni `@Input()`/`@Output()`
  clásicos. Usar `@if`/`@for`, `input()`, `output()`, `inject()` y signals.
- Estado local con signals; RxJS solo cuando haga falta (flujos HTTP complejos,
  eventos).
- Formularios con Signal Forms.
- Lógica de negocio y llamadas HTTP en servicios, nunca en componentes.
- Separar componentes contenedor (obtienen datos) de presentación
  (solo inputs/outputs).
- Tipos de la API alineados con el contrato del backend
  (`http://localhost:8080/v3/api-docs`). No inventar campos.
- Textos de interfaz en español.

## Autenticación
- Login en POST /api/auth/login → access token en el cuerpo; refresh token
  en cookie HttpOnly, Secure, SameSite=Strict, Path=/api/auth.
- Access token solo en memoria en el frontend; nunca en localStorage ni sessionStorage.
- Al cargar la app, llamar a /api/auth/refresh para recuperar la sesión.
- Refresh token rotado en cada uso. Logout en POST /api/auth/logout.

## Diseño
- Antes de tocar la UI, leer `.interface-design/system.md` (dirección, tokens propios
  `--paper`/`--ink*`/`--rule*`/`--carbon`, escalas y patrones). Estilos de componente solo con
  esos tokens y `--mat-sys-*`.
- Componentes de maquetación comunes: `core/layout/top-bar`, `shared/form-alert`.
- Usar siempre un componente de Angular Material antes de crear uno propio.
  Consultar API y ejemplos en https://material.angular.dev.
- Una sola librería de componentes (Angular Material + CDK); no añadir otras.
- El tema se define en `src/styles.scss` con `mat.theme()` y las paletas de
  `src/styles/_theme-colors.scss` (generadas con `ng generate @angular/material:m3-theme`
  desde `#6366F1`): colores, tipografía (pila del sistema) y densidad (0) se cambian AHÍ.
  Personalizar componentes con los mixins `mat.<componente>-overrides()` en `styles.scss`.
- Estilos propios solo con los tokens `var(--mat-sys-*)` (`--mat-sys-surface`,
  `--mat-sys-on-surface`, `--mat-sys-primary`...). Nunca colores fijos.
- Modo oscuro con `color-scheme` + `light-dark()`: `.app-dark` en `<html>` pone
  `color-scheme: dark`; todo debe verse bien en ambos modos.
- Formularios: `mat-form-field` (outline, sin asterisco) + `matInput` + `[formField]`;
  errores en `mat-error`; si el error no está en el `FieldState` (p. ej. del servidor),
  usar `errorStateMatcher`.
- Errores generales del servidor en un bloque `role="alert"` con `--mat-sys-error-container`.
- Botones con carga: `[disabled]` + `disabledInteractive` + `aria-busy` + `mat-progress-spinner`.
- Tablas con `mat-table` + `mat-paginator` + `matSort`: paginación, orden y filtros en
  servidor; textos del paginador en español con `MatPaginatorIntl`.
- Iconos solo con `mat-icon` y Material Symbols Outlined (Apache 2.0), autoalojada:
  subconjunto en `public/fonts/material-symbols-outlined.woff2` (licencia al lado) y
  `@font-face` en `styles.scss`. Nada se carga de CDNs externos (RGPD).
  Al usar un icono nuevo, regenerar el subconjunto con la lista completa de iconos en
  orden alfabético y actualizar el comentario del `@font-face`:
  ```
  ICONS=check,dark_mode,error,expand_more,groups,light_mode,logout,menu,radio_button_unchecked,visibility,visibility_off
  CSS=$(curl -s -A "Mozilla/5.0 Chrome/130.0" "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=$ICONS&display=block")
  curl -s "$(echo "$CSS" | grep -oE 'https://fonts.gstatic.com[^)]+')" -o public/fonts/material-symbols-outlined.woff2
  ```

## Tests
- Cada componente y servicio nuevo con su test.
- Servicios HTTP probados con `HttpTestingController`, sin llamadas reales.
- Para componentes de Material, preferir los harnesses (`@angular/cdk/testing`,
  `@angular/material/*/testing`) a selectores internos del DOM.
- Nunca desactivar ni borrar un test para que pase la build.