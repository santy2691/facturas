# Backend

API REST de la aplicación. Ver el CLAUDE.md raíz para contexto, autenticación
y reglas entre aplicaciones.

## Stack
- Java 25, Spring Boot 4.1, Maven
- PostgreSQL, migraciones con Flyway
- Spring Security con JWT
- Tests: JUnit 5, Mockito, Testcontainers

## Comandos
- BD local: `docker compose up -d db` (desde la raíz del proyecto)
- Arrancar: `./mvnw spring-boot:run -Dspring-boot.run.profiles=local`
  (requiere `JWT_SECRET`; ver "Variables de entorno")
- Tests: `./mvnw test` (no necesitan `JWT_SECRET`: usan un valor ficticio de
  `src/test/resources/application.properties`)
- Un test concreto: `./mvnw test -Dtest=NombreDelTest`

## Variables de entorno
- `JWT_SECRET` (obligatoria, sin valor por defecto): secreto HS256 de al menos
  32 bytes. Si falta, la aplicación no arranca. En local:
  `export JWT_SECRET=$(openssl rand -base64 48)`. Cambiarlo invalida los access
  tokens emitidos. Nunca versionarlo ni escribirlo en logs.
- `AUTH_COOKIE_SECURE` (opcional, `true` por defecto): pon `false` solo en local
  si el navegador no envía cookies `Secure` por `http://localhost` (p. ej. Safari).

## Estructura
Paquetes por funcionalidad, no por capa:

src/main/java/<paquete-base>/
├── common/   → excepciones, configuración y utilidades compartidas
├── auth/     → login, registro, refresh, JWT, configuración de seguridad
└── user/     → gestión de usuarios

Dentro de cada funcionalidad: controller, service, repository, dto, entity.

## Convenciones
- Inyección por constructor; nunca `@Autowired` en campos.
- Controllers sin lógica de negocio: validan (`@Valid`), delegan en el service
  y devuelven DTOs.
- Nunca exponer entidades JPA en la API.
- `@Transactional` en los services, no en los controllers.
- Errores con un `@RestControllerAdvice` común en `common/`; respuesta de
  error con formato único para toda la API.
- Fechas como `Instant` (UTC).
- Configuración sensible (secreto JWT, credenciales de BD) por variables de
  entorno, nunca en el código ni en ficheros versionados.

## Autenticación (implementación)
- Access token: JWT firmado, vida corta (15 min). No se guarda en BD.
- Refresh token: cadena aleatoria segura (no JWT), vida 7 días.
  - Se envía en cookie `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth`.
  - En BD, tabla `refresh_tokens`: solo el hash SHA-256, nunca el token en claro.
  - Columnas clave: `user_id`, `token_hash`, `family_id` (una por login),
    `expires_at`, `session_start`, `revoked_at`.
- Rotación: cada uso de `/api/auth/refresh` revoca el token y emite uno nuevo
  de la misma familia.
- Reutilización de un token revocado → revocar toda su familia y responder 401.
- Logout: revoca la familia de la sesión. Cambio de contraseña: revoca todos
  los tokens del usuario.
- Tarea `@Scheduled` que borra tokens caducados o revocados hace más de 7 días.

## Base de datos
- Nombres en snake_case e inglés; tablas en plural (`users`, `orders`).
- PK: `id BIGINT GENERATED ALWAYS AS IDENTITY`.
- Todas las tablas: `created_at`, `updated_at` (`TIMESTAMPTZ`).
- FKs siempre con índice y nombre explícito: `fk_<tabla>_<referencia>`.
- Importes en `NUMERIC(…)`, nunca `float`/`double`.
- Migraciones Flyway en `src/main/resources/db/migration/`,
  nombre `V<n>__descripcion.sql`.
- Nunca modificar una migración ya aplicada; crear una nueva.
- Nunca `spring.jpa.hibernate.ddl-auto=update`/`create`: el esquema lo gestiona solo Flyway.

## Tests
- Services: tests unitarios con Mockito.
- Controllers: `@WebMvcTest` con el service mockeado.
- Persistencia y flujos de seguridad: integración con Testcontainers.
- Nunca desactivar ni borrar un test para que pase la build.