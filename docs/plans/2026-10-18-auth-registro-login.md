# Autenticación: registro, login, refresh y logout (backend + frontend)

Nota (2026-10-18): PrimeNG sustituido por Angular Material; ver `2026-10-18-migracion-angular-material.md`

**Estado: APROBADO por el usuario (2026-10-18).**

## Objetivo
Permitir que un usuario se registre, inicie sesión, mantenga la sesión sin volver
a pedir credenciales (refresh con rotación) y la cierre. El backend emite un JWT
de vida corta y un refresh token opaco en cookie HttpOnly; el frontend ofrece
/login, /registro y una página protegida /inicio.

## Ámbito
ambos

## Estado actual (análisis)
**Backend** (`backend/`, paquete base `com.factura.backend`):
- Solo existe `BackendApplication.java`. No hay paquetes `common/`, `auth/` ni `user/`.
- `pom.xml` (Spring Boot 4.1.1): web MVC, JPA, Flyway, Security, Validation, Actuator,
  Lombok. No hay librería JWT, ni Testcontainers, ni springdoc (se añaden, aprobadas).
- `V1__create_users_table.sql`: `users(id, email VARCHAR(255), password_hash, first_name VARCHAR(75),
  last_name VARCHAR(75), role DEFAULT 'USER', enabled DEFAULT TRUE, created_at, updated_at)`
  + índice único `uq_users_email ON users (email)` (coincidencia exacta, sensible a
  mayúsculas). **Se usa tal cual**: no hace falta ninguna migración sobre `users`.
  Se asume que V1 ya está aplicada en local: no se modifica.
- `application.yml`: `ddl-auto: validate`, Flyway activo. `application-local.yml`
  contiene usuario/contraseña de BD en claro (ver Riesgos).
- `BackendApplicationTests.contextLoads` **falla hoy** (surefire: no hay DataSource en
  tests). Se arreglará con Testcontainers, no se borra.

**Frontend** (`frontend/`):
- Angular 22.2, PrimeNG 22, `@primeuix/themes`, PrimeIcons, Vitest + jsdom. Sin
  `provideHttpClient` en `app.config.ts`.
- `app.routes.ts`: `[{ path: '', component: MainLayout, children: [] }]`.
- `core/layout/main-layout` (cabecera "Facturas" + `app-theme-toggle`), `core/theme/theme.ts`
  (clase `Theme`, convención de nombres del CLI 22 sin sufijo `Service`).
- No existe `features/`, ni proxy de desarrollo (`proxy.conf.json`).
- Decisión previa del usuario: login y registro van **fuera** del layout con cabecera,
  en una pantalla mínima.

## Contrato de API

Base: `/api/auth`. JSON en UTF-8. Todas las respuestas de error usan **ProblemDetail
(RFC 9457)** con `Content-Type: application/problem+json`.

### Tipos comunes
```ts
// Respuesta de autenticación (register, login, refresh)
interface AuthResponse {
  accessToken: string;   // JWT firmado, HS256
  expiresIn: number;     // segundos de vida del access token (900)
  user: UserResponse;
}
interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;         // tal como se registró (sin normalizar)
  role: 'USER';          // de momento solo USER
}
// Error
interface ApiProblem {
  type: string;          // "about:blank"
  title: string;         // texto estándar HTTP ("Bad Request", "Conflict", ...)
  status: number;
  detail: string;        // mensaje en español apto para mostrar al usuario
  instance: string;      // path de la petición
  errors?: { field: string; message: string }[]; // solo en 400 de validación
}
```

### Cookie de refresh token
Nombre `refresh_token`. Atributos: `HttpOnly; Secure; SameSite=Strict; Path=/api/auth;
Max-Age=604800` (7 días). Valor: 32 bytes aleatorios (`SecureRandom`) en Base64URL sin
padding. Para borrarla: mismo nombre y atributos con `Max-Age=0`.

### POST /api/auth/register
Pública. Request:
```json
{ "firstName": "string", "lastName": "string", "email": "string", "password": "string", "confirmPassword": "string" }
```
Validaciones (backend, la fuente de verdad). Máximos alineados con las columnas de V1
(`first_name`/`last_name` VARCHAR(75), `email` VARCHAR(255)):
| Campo | Regla | Mensaje (`errors[].message`) |
|---|---|---|
| firstName | obligatorio, no vacío tras trim | `El nombre es obligatorio` |
| firstName | máx. 75 caracteres (tras trim) | `El nombre no puede superar 75 caracteres` |
| lastName | obligatorio, no vacío tras trim | `Los apellidos son obligatorios` |
| lastName | máx. 75 caracteres (tras trim) | `Los apellidos no pueden superar 75 caracteres` |
| email | obligatorio | `El email es obligatorio` |
| email | formato email | `Introduce un email válido` |
| email | máx. 254 caracteres | `El email no puede superar 254 caracteres` |
| password | obligatorio | `La contraseña es obligatoria` |
| password | 8-64 caracteres, al menos una letra y un número | `La contraseña debe tener al menos 8 caracteres, una letra y un número` |
| password | máx. 64 caracteres | `La contraseña no puede superar 64 caracteres` |
| confirmPassword | obligatorio | `Confirma la contraseña` |
| confirmPassword | igual a password | `Las contraseñas no coinciden` |

Regla de contraseña: regex `^(?=.*\p{L})(?=.*\p{Nd}).{8,64}$` (letra Unicode y dígito);
espacios permitidos; no se recorta. **Email: se guarda tal como llega, sin trim ni
minúsculas**; la unicidad es por coincidencia exacta (índice `uq_users_email` de V1).
Nombre y apellidos: se guardan recortados (trim). Rol: `USER`.

Respuestas:
- `201 Created` + `Set-Cookie: refresh_token=...` + body `AuthResponse` (sesión iniciada).
- `400` validación: `detail = "Hay errores en el formulario"`, `errors[]` con un elemento
  por campo/regla fallida.
- `409` email existente (coincidencia exacta): `detail = "Ya existe una cuenta con este email"`.

### POST /api/auth/login
Pública. Request: `{ "email": "string", "password": "string" }`.
- Validación: `email` y `password` obligatorios (`400`, mismos mensajes de "obligatorio"
  que en registro). No se aplica la regla de formato de contraseña en login.
- Búsqueda del usuario por email con **coincidencia exacta** (sin normalizar).
- `200 OK` + `Set-Cookie` + `AuthResponse`. Cada login crea una **familia** nueva.
- `401`: `detail = "Email o contraseña incorrectos"` si el email no existe, la contraseña
  no coincide **o** el usuario está deshabilitado (`enabled = false`).

### POST /api/auth/refresh
Pública (se autentica con la cookie). Sin body. No requiere `Authorization`.
- `200 OK` + `Set-Cookie` (token nuevo, misma familia) + `AuthResponse`.
- `401` con `detail = "La sesión ha caducado. Inicia sesión de nuevo"` y cookie borrada si:
  falta la cookie, el token no existe, está caducado, está revocado o el usuario está
  deshabilitado. Si estaba **revocado** (reutilización) → además se revoca toda la familia.

### POST /api/auth/logout
Pública (se identifica la sesión por la cookie). Sin body.
- `204 No Content` + cookie borrada. Revoca la familia del token si existe. Idempotente:
  sin cookie o con token desconocido/revocado también responde `204`.

### Resto de la API
- Cualquier ruta no pública requiere `Authorization: Bearer <accessToken>`. Sin token,
  token inválido o caducado → `401` ProblemDetail `detail = "No autenticado"`.
- JWT: `sub` = id de usuario (string), `roles` = `["USER"]`, `iat`, `exp` (+15 min),
  `iss` = `facturas-backend`. Sin datos personales adicionales.
- Rutas públicas: `/api/auth/register|login|refresh|logout`, `/actuator/health`,
  `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html`.
- **No se crea** `GET /api/auth/me`: el usuario viaja en `AuthResponse`.

## Criterios de aceptación

### Registro
- Dado un email no registrado y datos válidos, cuando se llama a register, entonces
  responde 201 con `AuthResponse` (`user.firstName`, `user.lastName`, `user.role = "USER"`),
  cookie `refresh_token` con todos los atributos, y en BD la contraseña es un hash BCrypt
  (`$2…`) y el refresh token solo existe como hash SHA-256.
- Dado `"Ana@Ejemplo.com"`, cuando se registra, entonces se guarda exactamente
  `Ana@Ejemplo.com` (sin pasar a minúsculas).
- Dado un email ya registrado con exactamente el mismo texto, entonces 409
  `"Ya existe una cuenta con este email"`. También si dos registros simultáneos chocan
  con el índice único (se traduce la `DataIntegrityViolationException`).
- Dado que existe `a@x.com`, cuando se registra `A@x.com`, entonces se crea una cuenta
  distinta (201) — comportamiento aceptado, ver Riesgos.
- Dado `firstName = "   "`, entonces 400 `"El nombre es obligatorio"`; dado
  `lastName = "   "`, entonces 400 `"Los apellidos son obligatorios"`.
- Dado `firstName` o `lastName` de 75 caracteres, entonces se acepta; de 76, entonces 400
  `"El nombre no puede superar 75 caracteres"` / `"Los apellidos no pueden superar 75 caracteres"`.
- Dada una contraseña `"abcdefgh"` (sin número), `"12345678"` (sin letra) o `"abc123"`
  (corta), entonces 400 con `errors[{field:"password", message:"La contraseña debe tener al menos 8 caracteres, una letra y un número"}]`.
- Dada una contraseña de 8 caracteres con letra y número (`"abcdefg1"`), entonces se acepta (límite).
- Dada una contraseña de 65 caracteres, entonces 400 `"La contraseña no puede superar 64 caracteres"`.
- Dado `confirmPassword` distinto, entonces 400 `errors[{field:"confirmPassword", message:"Las contraseñas no coinciden"}]`.
- En el frontend, tras 201, el usuario queda autenticado y se navega a `/inicio`.

### Login
- Dadas credenciales correctas, entonces 200 + cookie + `AuthResponse`; en el frontend
  navega a `/inicio`.
- Dado email inexistente, contraseña errónea o usuario deshabilitado, entonces 401 con
  exactamente `"Email o contraseña incorrectos"`; el frontend muestra ese texto sin
  indicar qué campo falla y no limpia el email.
- Dado un usuario registrado como `ana@x.com`, cuando intenta entrar con `Ana@x.com`,
  entonces 401 `"Email o contraseña incorrectos"` (coincidencia exacta).

### Refresh y sesión
- Dada una cookie válida, cuando se llama a refresh, entonces 200, el token anterior queda
  con `revoked_at`, se crea uno nuevo con el mismo `family_id` y `session_start`, y la
  cookie cambia.
- Dado un token ya rotado (reutilizado), entonces 401, se revocan todos los tokens de la
  familia y el token nuevo legítimo deja de funcionar (401).
- Dado un token caducado, desconocido o sin cookie, entonces 401 y cookie borrada.
- Dos peticiones de refresh concurrentes con el mismo token: solo una rota; la otra
  se trata como reutilización (bloqueo `PESSIMISTIC_WRITE` en la lectura del token).
- En el frontend, al recargar cualquier página con una cookie válida, la sesión se
  recupera **antes** de resolver los guards (no hay parpadeo a /login).
- Si una petición a la API (no de `/api/auth/*`) devuelve 401, el frontend llama a
  refresh una sola vez (compartida entre peticiones concurrentes), reintenta con el token
  nuevo y, si refresh falla, limpia la sesión y navega a `/login`. Nunca entra en bucle.

### Logout
- Dado un usuario autenticado, cuando pulsa "Cerrar sesión" en /inicio, entonces se llama a
  logout, se revoca la familia, se borra la cookie, se limpia el estado en memoria y se
  navega a `/login`. Si la llamada falla (red), igualmente se limpia el estado y se navega.
- Tras logout, refresh con la cookie anterior → 401.
- Otras sesiones (otras familias/dispositivos) del mismo usuario siguen activas.

### Rutas y pantallas (frontend)
- `/login` y `/registro`: fuera del layout con cabecera, pantalla mínima centrada con
  el texto "Facturas" encima de un `p-card` y el botón de tema en una esquina.
  Títulos de tarjeta "Iniciar sesión" / "Crear cuenta". `/login` enlaza a `/registro`
  ("¿No tienes cuenta? Regístrate") y viceversa ("¿Ya tienes cuenta? Inicia sesión").
- El formulario de registro tiene, en este orden: "Nombre", "Apellidos", "Email",
  "Contraseña", "Confirmar contraseña".
- `/inicio`: dentro de `MainLayout`, protegida; muestra `Hola, <firstName>` y un botón
  `Cerrar sesión` (icono `pi pi-sign-out`).
- Sin sesión, acceder a `/inicio` (o `/`) → redirige a `/login`.
- Con sesión, acceder a `/login` o `/registro` → redirige a `/inicio`.
- `/` → `/inicio`. Ruta desconocida → `/inicio`. Sin página 404 por ahora.
- Mientras se envía un formulario, el botón muestra `loading` y no permite doble envío.
- Validación en cliente con los mismos mensajes que el backend; los errores se muestran
  al tocar el campo o al intentar enviar. El email se envía tal como se escribe (sin
  trim ni minúsculas). Errores 400 del servidor se asignan a su campo por
  `errors[].field`; 401/409 muestran `detail` en un `p-message` de severidad `error`
  sobre el botón. Error de red o 5xx: `"No se ha podido completar la operación. Inténtalo de nuevo más tarde."`
- Todo se ve bien en modo claro y oscuro (solo variables `--p-*`).
- El access token nunca se escribe en `localStorage`/`sessionStorage` (test explícito).
- Ningún log (backend) contiene contraseñas, access tokens ni refresh tokens.

## Pasos — backend

> Requiere Docker arrancado para los tests de Testcontainers.
> Cada paso: `./mvnw test` en verde antes de pasar al siguiente.

1. [x] **Dependencias (aprobadas).**
   `pom.xml`: `spring-boot-starter-oauth2-resource-server` (Nimbus JOSE para firmar/verificar
   JWT); scope test: `spring-boot-testcontainers`, `org.testcontainers:testcontainers-postgresql`
   y `org.testcontainers:testcontainers-junit-jupiter` (versiones del BOM de Boot);
   `org.springdoc:springdoc-openapi-starter-webmvc-ui` (versión compatible con Boot 4.1,
   comprobar en la matriz de springdoc). Si alguna exige otra dependencia no listada,
   parar y preguntar.
   Verificación: `./mvnw dependency:tree` sin conflictos; `./mvnw compile`.

2. [x] **Infraestructura de tests y arreglo de `contextLoads`.**
   `src/test/java/com/factura/backend/TestcontainersConfiguration.java` con
   `@TestConfiguration(proxyBeanMethods = false)` y un `PostgreSQLContainer("postgres:17")`
   con `@ServiceConnection`. `BackendApplicationTests` lo importa (`@Import`).
   Propiedad `app.auth.jwt-secret` de test vía `src/test/resources/application.yml` (valor
   ficticio solo para tests, ver Riesgos).
   Verificación: `./mvnw test -Dtest=BackendApplicationTests` pasa (hoy falla).

3. [x] **Configuración y propiedades.**
   - `common/config/AuthProperties` (`@ConfigurationProperties("app.auth")`, `@Validated`):
     `jwtSecret` (obligatorio, ≥ 32 bytes, Base64), `accessTokenTtl` (`PT15M`),
     `refreshTokenTtl` (`P7D`), `cookieSecure` (`true`), `issuer` (`facturas-backend`).
   - `application.yml`: `app.auth.jwt-secret: ${JWT_SECRET}` (sin valor por defecto en
     ningún perfil), `app.auth.cookie-secure: ${AUTH_COOKIE_SECURE:true}`, TTLs.
   - `common/config/ClockConfig`: bean `Clock.systemUTC()` (para tests deterministas).
   - Arranque sin `JWT_SECRET` → falla al iniciar con mensaje claro.
   Verificación: test unitario de binding/validación de propiedades (`ApplicationContextRunner`).

4. [x] **Formato de errores común.**
   `common/error/GlobalExceptionHandler` (`@RestControllerAdvice`) que devuelve `ProblemDetail`:
   `MethodArgumentNotValidException` → 400 con `errors[]` y `detail "Hay errores en el formulario"`;
   `HttpMessageNotReadableException` → 400 `"Petición mal formada"`;
   excepciones de dominio (`EmailAlreadyExistsException` → 409, `InvalidCredentialsException`
   y `InvalidRefreshTokenException` → 401); `Exception` → 500 `"Error interno"` sin filtrar
   detalles. `common/error/ProblemDetailAuthenticationEntryPoint` para 401 del filtro de
   seguridad con el mismo formato.
   Tests: `@WebMvcTest` con un controller de prueba en `src/test` que lance cada excepción
   y compruebe status, `detail`, `errors[]` y `Content-Type: application/problem+json`.

5. [x] **Migración V2 (única migración nueva).**
   `V2__create_refresh_tokens_table.sql`: `id BIGINT GENERATED ALWAYS AS IDENTITY PK`,
   `user_id BIGINT NOT NULL`, `token_hash CHAR(64) NOT NULL` (SHA-256 hex),
   `family_id UUID NOT NULL`, `session_start TIMESTAMPTZ NOT NULL`,
   `expires_at TIMESTAMPTZ NOT NULL`, `revoked_at TIMESTAMPTZ NULL`, `created_at`,
   `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
   `CONSTRAINT fk_refresh_tokens_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`;
   índices `uq_refresh_tokens_token_hash` (único), `idx_refresh_tokens_user_id`,
   `idx_refresh_tokens_family_id`.
   La tabla `users` no se toca: V1 ya tiene `first_name`, `last_name` y el índice único
   exacto `uq_users_email`.
   Verificación: el test de contexto (Flyway + `ddl-auto: validate`) pasa con Testcontainers.

6. [x] **Módulo `user/`.**
   `user/entity/User` (JPA: `firstName`, `lastName`, `email`, `passwordHash`, `role`,
   `enabled`; `Instant` para fechas con `@PrePersist/@PreUpdate` o
   `@CreationTimestamp/@UpdateTimestamp`), `user/entity/Role` (enum `USER`,
   `@Enumerated(STRING)`), `user/repository/UserRepository` (`findByEmail`, `existsByEmail`,
   ambos por coincidencia exacta).
   Tests: `@DataJpaTest` + Testcontainers (`@AutoConfigureTestDatabase(replace = NONE)`):
   guardar y leer; el índice único de email lanza `DataIntegrityViolationException` con el
   mismo texto; `a@x.com` y `A@x.com` se pueden guardar ambos.

7. [x] **Refresh tokens: entidad, repositorio y servicio.**
   `auth/entity/RefreshToken`, `auth/repository/RefreshTokenRepository`
   (`findByTokenHash` con `@Lock(PESSIMISTIC_WRITE)`, `revokeFamily(familyId, now)`,
   `deleteExpiredOrRevokedBefore(threshold)`), `auth/service/RefreshTokenService`:
   - `issue(user, familyId, sessionStart)` → genera token aleatorio, guarda solo el
     SHA-256 hex, devuelve el valor en claro una única vez.
   - `rotate(rawToken)` → busca por hash; si no existe/caducado → `InvalidRefreshTokenException`;
     si revocado → revoca familia (en transacción propia `REQUIRES_NEW` para que no se
     deshaga al lanzar la excepción) y lanza; si válido → revoca y emite uno nuevo de la familia
     con el mismo `session_start` y `expires_at = now + 7 días`.
   - `revokeFamilyOf(rawToken)` → para logout; no lanza si no existe.
   Tests unitarios (Mockito, `Clock` fijo): cada rama anterior; el hash guardado ≠ token;
   el token nuevo conserva `family_id` y `session_start`.
   Tests `@DataJpaTest`: `revokeFamily` solo afecta a esa familia; borrado de caducados/revocados.

8. [x] **Emisión de JWT.**
   `auth/service/JwtService` con `NimbusJwtEncoder` (HS256, `SecretKeySpec` del secreto):
   claims `sub`, `roles`, `iss`, `iat`, `exp`. `JwtDecoder` en la config de seguridad
   (`NimbusJwtDecoder.withSecretKey`) y `JwtAuthenticationConverter` que mapea `roles` →
   `ROLE_<rol>`.
   Tests unitarios: el token generado se decodifica con el decoder, `exp - iat = 900 s`,
   `roles = ["USER"]`; token caducado o firmado con otra clave → rechazado.

9. [x] **Seguridad.**
   `auth/config/SecurityConfig`: `SessionCreationPolicy.STATELESS`, CSRF deshabilitado
   (justificación en Riesgos), `formLogin`/`httpBasic` deshabilitados, rutas públicas del
   contrato, resto `authenticated()`, `oauth2ResourceServer(jwt)` con el entry point de
   ProblemDetail. Beans `PasswordEncoder` (`BCryptPasswordEncoder`), `UserDetailsService`
   (por email exacto; `enabled` → `isEnabled`) y `AuthenticationManager`
   (`DaoAuthenticationProvider`, que ya mitiga enumeración por tiempo).
   Tests de integración (Testcontainers + MockMvc): ruta no pública sin token → 401
   ProblemDetail; con token válido → no 401 (404 al no existir); token caducado → 401;
   `/v3/api-docs` accesible sin token.

10. [x] **`AuthService` y DTOs.**
    `auth/dto/RegisterRequest` (`firstName`, `lastName`, `email`, `password`, `confirmPassword`),
    `LoginRequest` (records con Bean Validation y los mensajes exactos del contrato;
    restricción de clase `@PasswordsMatch` que reporta en `confirmPassword`; la validación
    de "no vacío tras trim" y longitud de nombre/apellidos sobre el valor recortado),
    `AuthResponse`, `UserResponse` (`id`, `firstName`, `lastName`, `email`, `role`).
    `auth/service/AuthService` (`@Transactional`): `register`, `login`, `refresh`, `logout`.
    Devuelve un resultado interno con `AuthResponse` + refresh token en claro (el controller
    pone la cookie). Recorta nombre y apellidos; **no** modifica el email. Traduce
    `BadCredentialsException`/`DisabledException` a `InvalidCredentialsException` y la
    violación de `uq_users_email` a `EmailAlreadyExistsException`.
    Tests unitarios (Mockito): registro feliz (hash BCrypt usado, rol USER, email guardado
    sin cambios, nombre/apellidos recortados), email duplicado (por `existsByEmail` y por
    carrera), login feliz, login fallido, usuario deshabilitado, refresh feliz y fallido, logout.
    Test de validación de DTOs con `Validator` (contraseña: 7, 8, 64, 65 caracteres; sin letra;
    sin número; con letra no ASCII `"contraseña1"`; nombre/apellidos: vacío, solo espacios,
    75 y 76 caracteres).

11. [x] **`AuthController` y cookie.**
    `auth/controller/AuthController` sin lógica: `@Valid`, delega en `AuthService`, construye
    la cookie con `ResponseCookie` (helper `auth/controller/RefreshTokenCookie`), lee la
    cookie con `@CookieValue(required = false)`. Códigos según el contrato.
    Tests `@WebMvcTest(AuthController.class)` con `AuthService` mockeado e importando
    `SecurityConfig` y el advice: 201/200 con `Set-Cookie` y todos sus atributos; 400 con
    `errors[]`; 409; 401 con el mensaje exacto; refresh sin cookie → 401 y cookie borrada;
    logout → 204 y cookie borrada.

12. [x] **Limpieza programada.**
    `@EnableScheduling` (en `common/config`), `auth/service/RefreshTokenCleanupTask` con
    `@Scheduled(cron = "${app.auth.cleanup-cron:0 0 3 * * *}")` que borra tokens con
    `expires_at` o `revoked_at` anteriores a `now - 7 días`.
    Test unitario con `Clock` fijo (umbral correcto) + el `@DataJpaTest` del paso 7.

13. [x] **Test de integración de flujo completo (Testcontainers + MockMvc).**
    `auth/AuthFlowIT` (o `*Test` si no hay failsafe configurado): registro → refresh (rota)
    → reutilizar token viejo (401 y familia revocada) → refresh con el nuevo (401);
    login → logout → refresh (401); dos logins = dos familias, logout de una no afecta
    a la otra; login con email en distinta capitalización → 401; en BD `password_hash`
    empieza por `$2` y no hay ningún token en claro.
    Test de logs: con `OutputCaptureExtension`, tras register/login/refresh la salida no
    contiene la contraseña ni el valor de los tokens.

14. [ ] **Documentación de arranque.**
    Indicar en el CLAUDE.md raíz/backend (pedir permiso antes de tocarlos) que hace falta
    `JWT_SECRET` para arrancar (`export JWT_SECRET=$(openssl rand -base64 48)`).
    Verificación manual: arrancar con perfil `local`, probar los 4 endpoints con `curl -i`
    y revisar `http://localhost:8080/v3/api-docs`.

## Pasos — frontend

> Empezar cuando el backend esté terminado y el contrato verificado en `/v3/api-docs`.
> Generar con `npx ng generate`. Antes de usar cada componente PrimeNG (`Card`,
> `InputText`, `Password`, `Button`, `Message`, `FloatLabel` si se usa) consultar el MCP
> `primeng`; al terminar, `validate_usage`. Cada paso: `npm test` en verde.

1. [x] **Proxy de desarrollo y HttpClient.**
   `frontend/proxy.conf.json` (`/api` → `http://localhost:8080`, `secure: false`) y
   `"proxyConfig"` en `serve.options` de `angular.json`. En `app.config.ts`:
   `provideHttpClient(withInterceptors([authInterceptor]))` (el interceptor se añade en el paso 4).
   Las URLs de la API son relativas (`/api/auth/...`): mismo origen, sin CORS ni `withCredentials`.
   Verificación: `npm start` y `curl -i -X POST http://localhost:4200/api/auth/logout` → 204.

2. [x] **Tipos de la API.** `core/auth/auth.models.ts` con `AuthResponse`, `UserResponse`
   (`firstName`, `lastName`), `RegisterRequest`, `LoginRequest`, `ApiProblem` exactamente
   como el contrato. Verificación: `npm run build`.

3. [x] **Servicio `Auth` (core/auth).** `npx ng generate service core/auth/auth`.
   - Estado privado con signals: `accessToken`, `user`; públicos `user` (readonly) e
     `isAuthenticated` (computed).
   - `register(req)`, `login(req)`: `Observable<UserResponse>`; guardan token y usuario.
   - `refresh()`: `Observable<string>` (nuevo token); **una sola petición en vuelo**
     compartida (`shareReplay` + reset al terminar).
   - `restoreSession(): Promise<void>`: llama a refresh; en cualquier error deja la sesión
     vacía y resuelve (nunca rechaza).
   - `logout(): Observable<void>`: llama a la API y limpia el estado siempre (`finalize`).
   - `token()` para el interceptor; `clear()`.
   Tests (`HttpTestingController`): cada método hace la petición correcta y actualiza las
   signals; refresh 401 limpia; dos `refresh()` simultáneos → una sola petición; logout con
   error de red limpia igualmente; `restoreSession` resuelve aunque falle; espía de
   `Storage.prototype.setItem` → nunca se llama con el token.

4. [x] **Interceptor `authInterceptor` (core/auth).** `npx ng generate interceptor core/auth/auth`
   (funcional). Añade `Authorization: Bearer` a peticiones `/api/**` que no sean
   `/api/auth/**` si hay token. Ante 401 en esas peticiones: `auth.refresh()` →
   reintenta una vez con el token nuevo; si refresh falla → `auth.clear()` y
   `router.navigate(['/login'])`, y propaga el error.
   Tests: cabecera presente/ausente según URL y token; 401 → refresh → reintento con token
   nuevo; dos peticiones con 401 → un solo refresh; refresh falla → navega a `/login`;
   401 en `/api/auth/login` no dispara refresh; el reintento con 401 no vuelve a refrescar.

5. [x] **Recuperar sesión al arrancar.** En `app.config.ts`:
   `provideAppInitializer(() => inject(Auth).restoreSession())`.
   Test: con `HttpTestingController`, el bootstrap espera la respuesta de refresh
   (o test de la función initializer aislada).

6. [x] **Guards (core/auth).** `authGuard` (si no autenticado → `UrlTree` a `/login`) y
   `guestGuard` (si autenticado → `UrlTree` a `/inicio`), funcionales.
   Tests con `TestBed.runInInjectionContext` y `Auth` con signal controlable.

7. [x] **Layout mínimo de autenticación.** `npx ng generate component core/layout/auth-layout`:
   contenedor centrado a pantalla completa con el texto "Facturas" encima de
   `<router-outlet />` (donde se pinta la tarjeta) y `app-theme-toggle` en una esquina.
   SCSS solo con `--p-*`. OnPush.
   Tests: contiene "Facturas", `app-theme-toggle` y `router-outlet`.

8. [x] **Pantalla de login (features/auth/login).**
   Contenedor `features/auth/login/login` (inyecta `Auth` y `Router`, gestiona `loading`
   y error de servidor) + presentación `features/auth/login-form/login-form` (`input()`
   para `loading`/`serverError`, `output()` `submitted` con `LoginRequest`).
   Formulario con **Signal Forms** (verificar la API exacta de Angular 22: `form()`,
   validadores `required`, `email`, directiva de enlace de campo). PrimeNG: `p-card`
   con título "Iniciar sesión", `pInputText` (email, `autocomplete="email"`), `p-password`
   (`[feedback]="false"`, `toggleMask`, `autocomplete="current-password"`), `p-button`
   con `loading`, `p-message`. Enlace `routerLink="/registro"`. Tras éxito → `/inicio`.
   Tests: mensajes de validación; no emite si inválido; emite con datos válidos (email sin
   modificar); el contenedor muestra `"Email o contraseña incorrectos"` con 401 y el
   genérico con 0/5xx; navega a `/inicio`; el enlace apunta a `/registro`.

9. [x] **Pantalla de registro (features/auth/register).**
   Igual estructura (`register` + `register-form`), `p-card` con título "Crear cuenta".
   Campos "Nombre" (`firstName`, `autocomplete="given-name"`), "Apellidos" (`lastName`,
   `autocomplete="family-name"`), "Email", "Contraseña" (`autocomplete="new-password"`),
   "Confirmar contraseña". Validadores con los mensajes del contrato (máx. 75 en nombre y
   apellidos; regex con flag `u`; coincidencia de contraseñas como validación de formulario
   asignada a `confirmPassword`). 400 del servidor → errores en su campo; 409 → `p-message`
   con `"Ya existe una cuenta con este email"`. Tras éxito → `/inicio`.
   Tests: cada regla y límite (contraseña 7/8/64/65, sin letra, sin número; nombre y
   apellidos vacíos, solo espacios, 75/76), no coincide, mapeo de `errors[]` (incluido
   `lastName`), 409, navegación, enlace a `/login`.

10. [x] **Página de inicio (features/home).** Contenedor `features/home/home` que lee
    `auth.user()` y llama a `logout()` → navega a `/login` (también si falla).
    Muestra `Hola, {{ firstName }}` y `p-button` "Cerrar sesión" (`pi pi-sign-out`).
    Tests: muestra `Hola, <firstName>` (y no los apellidos); el click llama a logout y
    navega; botón en `loading` mientras.

11. [x] **Rutas.** `app.routes.ts`:
    ```ts
    [
      { path: '', component: AuthLayout, canActivate: [guestGuard], children: [
          { path: 'login', loadComponent: () => import(...).then(m => m.Login), title: 'Iniciar sesión · Facturas' },
          { path: 'registro', loadComponent: ..., title: 'Crear cuenta · Facturas' },
      ]},
      { path: '', component: MainLayout, canActivate: [authGuard], children: [
          { path: 'inicio', loadComponent: ..., title: 'Inicio · Facturas' },
          { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      ]},
      { path: '**', redirectTo: 'inicio' },
    ]
    ```
    (El ejecutor puede ajustar la forma, p. ej. `canMatch`, mientras se cumplan los criterios.)
    Tests de router (`RouterTestingHarness`): sin sesión `/inicio` y `/` → `/login`; con
    sesión `/login` → `/inicio`; ruta desconocida → `/inicio`; `/login` no renderiza la
    cabecera de `MainLayout`. Actualizar `main-layout.spec.ts`/`app.spec.ts` si cambian
    (no borrar tests).

12. [ ] **Verificación final.** `npm test`, `npm run build` (budget), `validate_usage` del MCP
    sobre todos los componentes PrimeNG usados. Manual con backend arrancado: registro →
    /inicio con "Hola, <nombre>"; recargar → sigue en /inicio; logout → /login; recargar →
    sigue en /login; login con contraseña errónea → mensaje genérico; DevTools: cookie
    `refresh_token` HttpOnly con `Path=/api/auth`, nada en `localStorage` salvo `theme`;
    modo claro y oscuro.

## Riesgos
- **Email sensible a mayúsculas (decisión del usuario):** al guardar el email tal cual y
  buscar por coincidencia exacta, `A@x.com` y `a@x.com` serían cuentas distintas, y un
  usuario que escriba su email con otra capitalización no podrá entrar ("Email o
  contraseña incorrectos"). Tampoco se recortan espacios: un email con espacios al
  principio o al final no pasará la validación de formato (400 "Introduce un email válido").
- **CLAUDE.md backend: "configuración sensible por variables de entorno, nunca en ficheros
  versionados".** `application-local.yml` ya tiene la contraseña de BD en claro (y el
  `docker-compose.yml` también). No es de esta tarea, pero se recomienda pasarla a
  `${DB_PASSWORD}`. El secreto JWT de tests en `src/test/resources` es un valor ficticio
  sin uso real; si se considera violación, usar `@DynamicPropertySource` generándolo al vuelo.
- **CSRF deshabilitado**: la API usa Bearer (inmune a CSRF). Los endpoints que usan cookie
  (`refresh`, `logout`) quedan protegidos por `SameSite=Strict` + `Path=/api/auth` y porque
  `refresh` solo devuelve el token en el body (un atacante cross-site no puede leerlo).
- **Cookie `Secure` en local por HTTP**: Chrome y Firefox la aceptan en `localhost`;
  Safari puede no hacerlo. Por eso `cookie-secure` es configurable con `AUTH_COOKIE_SECURE`.
- **Producción**: el proxy de Angular solo existe en desarrollo. En despliegue, frontend y
  API deben servirse bajo el mismo dominio (reverse proxy) o habrá que configurar CORS con
  credenciales y revisar `SameSite`. Fuera de alcance.
- **Detección de reutilización vs. concurrencia**: dos pestañas que refrescan a la vez con
  la misma cookie pueden provocar la revocación de la familia y cerrar la sesión. Es raro;
  se acepta sin período de gracia.
- **Signal Forms + PrimeNG**: `p-password` es un `ControlValueAccessor`; si la integración
  con Signal Forms en Angular 22 no funciona, usar `<input pInputText type="password">`
  (consultar MCP) en vez de pasar a Reactive Forms (eso violaría el CLAUDE.md).
- **Límite de BCrypt (72 bytes)**: el máximo de 64 caracteres lo evita salvo con
  caracteres multibyte extremos; Spring Security lanza error si se supera. Test incluido.
- **Spring Boot 4 / Jackson 3**: el entry point de seguridad debe serializar ProblemDetail
  con el `JsonMapper` del contexto (paquete `tools.jackson`), no con un `ObjectMapper` propio.
- **springdoc y Boot 4.1**: hay que usar una versión de springdoc que soporte Boot 4.1;
  si no existe aún una compatible, parar y preguntar.
- **Tests de backend requieren Docker** en local y en CI.
- **V1 posiblemente aplicada**: no se modifica. Esta tarea solo añade la migración V2.
- Sin rate limiting: el login es susceptible a fuerza bruta hasta que se añada (tarea futura).

## Decisiones
1. **B1 Nombre:** se mantienen `first_name` y `last_name` de V1, sin migración sobre
   `users`. API, DTOs, entidad, `AuthResponse.user` y formulario usan `firstName` ("Nombre")
   y `lastName` ("Apellidos"), máximo 75 caracteres cada uno (columnas de V1). En /inicio
   se muestra "Hola, <firstName>".
2. **B2 Tokens:** access 15 min; refresh 7 días deslizante (cada rotación da 7 días más);
   `session_start` se guarda sin límite absoluto de sesión; sin período de gracia.
3. **B3 Refresh token:** hash SHA-256 en BD, familias por login, rotación en cada uso,
   revocación de familia por reutilización, limpieza diaria (03:00) de caducados/revocados
   con más de 7 días.
4. **B4 Errores:** `ProblemDetail` con extensión `errors[]` `{field, message}` y `detail`
   en español mostrable al usuario.
5. **B5 Secreto JWT:** HS256 con `JWT_SECRET` (≥ 32 bytes, Base64) solo por variable de
   entorno en todos los perfiles, sin valor por defecto. Cookie `Secure` por defecto,
   configurable con `AUTH_COOKIE_SECURE`.
6. **B6 Dependencias aprobadas:** `spring-boot-starter-oauth2-resource-server`,
   `spring-boot-testcontainers` + `testcontainers-postgresql` + `testcontainers-junit-jupiter`,
   `springdoc-openapi-starter-webmvc-ui`. Frontend: ninguna.
7. **B7 Local:** proxy de Angular (`/api` → `:8080`), sin CORS.
8. **B8 Usuario:** dentro de `AuthResponse` (login, registro, refresh); sin `/api/auth/me`.
9. **B9 Usuario deshabilitado:** 401 genérico en login y 401 en refresh.
10. **B10 Email:** se guarda tal como llega (sin minúsculas ni trim), unicidad y búsqueda
    por coincidencia exacta con el índice único `uq_users_email` que ya existe en V1
    (no hace falta paso adicional). Sin índice sobre `lower(email)`.
11. **B11 Navegación:** con sesión, `/login` y `/registro` → `/inicio`; `/` y rutas
    desconocidas → `/inicio`. Sin página 404.
12. **B12 Pantalla de login/registro:** "Facturas" encima de una `p-card` centrada con
    título ("Iniciar sesión" / "Crear cuenta") y botón de tema en una esquina.
13. **B13 Rate limiting:** fuera de alcance; tarea futura.
14. **B14 Longitudes:** nombre 1-75, apellidos 1-75, email ≤ 254, contraseña 8-64.
15. **B15 Textos:** aprobados los mensajes del contrato y de los criterios de aceptación.
16. **B16 "Letra":** cualquier letra Unicode (`\p{L}`) y dígito; espacios permitidos;
    la contraseña no se recorta.
17. **B17 E2E con Playwright:** tarea aparte.
