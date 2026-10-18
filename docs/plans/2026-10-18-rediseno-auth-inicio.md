# Rediseño de login, registro e inicio

**Estado: APROBADO por el usuario (2026-10-18)**, a partir del lienzo de diseño revisado con él
(sin factura de muestra y sin dobles filetes).

## Ámbito
Solo frontend. No cambian la API, las rutas ni las reglas de validación.

## Cambios

### Login (`features/auth/login-form`)
- Sin `mat-card`. Cabecera de documento: metadato "Acceso" (12/500 `--ink-faint`, mayúsculas) sobre el
  `h1` "Iniciar sesión"; 32px hasta el formulario, sin línea.
- Formulario, alerta, botón y enlace igual que ahora.

### Registro (`features/auth/register-form`)
- Sin `mat-card`. Metadato "Alta de usuario" sobre el `h1` "Crear cuenta".
- Dos `fieldset` con `legend` (caption 11/500 `--ink-faint`): "Datos personales" (nombre y apellidos en la
  misma fila con `flex-wrap`, y email) y "Acceso" (contraseña y confirmación), separados por un filete de 1px.
- Bajo la contraseña, lista de requisitos que se marcan al escribir (`aria-live="polite"`, enlazada con
  `aria-describedby`): "Al menos 8 caracteres", "Una letra", "Un número". Misma regla que `PASSWORD_PATTERN`.
  Cumplido: icono `check` y `--ink`; pendiente: `radio_button_unchecked` y `--ink-faint` (difieren en forma
  y luminosidad; sin colores fijos).
- "Las contraseñas no coinciden" aparece en cuanto la confirmación deja de ser un prefijo de la contraseña,
  sin esperar a salir del campo.

### Barra superior y menú de cuenta
- Nuevo `core/layout/account-menu`: con sesión iniciada, botón con iniciales + nombre + `expand_more` que abre
  un `mat-menu` con nombre completo, email y "Cerrar sesión" (icono `logout`). En móvil solo las iniciales.
- La lógica de logout pasa de `Home` a `AccountMenu` (mismo comportamiento: navega a `/login` aunque falle).
- `TopBar` muestra el menú solo si hay usuario (no aparece en login/registro).

### Inicio (`features/home`)
- Cabecera: fecha y saludo, sin botón ni línea.
- Sección "Libro registro" (`h2` + "Ejercicio <año>") con `mat-table` vacía: columnas Nº, Fecha, Cliente, Base,
  IVA, Total, Estado; fila `*matNoDataRow` con icono `description`, "Aún no hay facturas" y texto de apoyo;
  fila de pie "Total del ejercicio 0,00 €". Sin paginador ni ordenación hasta que haya datos (YAGNI).

### Sistema
- Iconos nuevos: `check`, `description`, `expand_more`, `radio_button_unchecked` → regenerar el subconjunto.
- `styles.scss`: overrides de `menu` (radio overlay) y `table` (cabecera en caption `--ink-faint`); se quitan
  los de `card`, que ya no se usa.
- `.interface-design/system.md`: actualizar patrones (hoja de auth sin tarjeta, menú de cuenta, libro registro,
  lista de requisitos).

## Tests
- `login-form`, `register-form`: estructura sin tarjeta, requisitos en vivo, aviso de no coincidencia.
- `account-menu` (nuevo): iniciales, nombre, logout con carga, navegación aunque falle.
- `top-bar`: menú solo con sesión.
- `home`: sin botones, libro registro vacío, total y año.
