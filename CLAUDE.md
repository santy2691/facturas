# <Nombre del proyecto>

## Contexto
creacion de nueva aplicacion, donde primero se empezar creando el sistema de login y registro de usuario


## Glosario
 - **Usuario**: persona registrada que accede a la aplicación.

## Aplicaciones
- **backend/**: API REST. Única fuente de verdad y de reglas de negocio.
- **frontend/**: aplicación web que consume la API.
<!-- Si hay más de un frontal, añade una línea por cada uno con sus usuarios. -->

Cada aplicación es un repo git independiente con su propio CLAUDE.md,
donde están las convenciones técnicas detalladas.

## Stack
- Backend: Java 25, Spring Boot 4.1, Maven
- Autenticación: Spring Security con JWT (access token + refresh token)
- Base de datos: PostgreSQL (Docker en local), migraciones con Flyway
- Frontend: Angular 22 (standalone, signals, OnPush por defecto), SCSS
- Tests: JUnit 5 + Mockito + Testcontainers (backend); tests de Angular (frontend);
  Playwright para E2E

## Módulos funcionales
<!-- TODO: completar al definir los primeros módulos.
| Módulo | backend | frontend |
|--------|---------|----------|
| ...    | ...     | ...      | -->

## Autenticación
- Login en POST /api/auth/login → devuelve access token y refresh token.
- El frontend envía el access token en Authorization: Bearer <token>.
- Access token de vida corta; al caducar, el frontend lo renueva con POST /api/auth/refresh sin pedir login al usuario.
- Los roles van en el token, pero los permisos se comprueban SIEMPRE en backend; el frontend solo los usa para mostrar u ocultar opciones.
- Registro en POST /api/auth/register.
- Contraseñas siempre con hash (BCrypt); nunca en claro ni reversibles.
- Email único por usuario.
- Nunca guardar contraseñas ni tokens en logs.

## Reglas al trabajar entre aplicaciones
- Las reglas de negocio viven en backend. El frontend valida para mejorar la
  experiencia, pero nunca es la única validación.
- Un cambio de API se hace primero en backend y después en el frontend.
- Antes de modificar o eliminar un endpoint, buscar sus usos en el frontend.
- Contrato de la API: `http://localhost:8080/v3/api-docs` con el backend arrancado.


## Arrancar el entorno
- BD: `cd backend && docker compose up -d db`
- Backend: `cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local`
- Frontend: `cd frontend && npm start` → http://localhost:4200

## Principios comunes
- Código en inglés; textos al usuario en español.
- Prioridad si chocan: claridad > KISS/YAGNI > SOLID.
- No añadir abstracciones "por si acaso" ni dependencias nuevas sin preguntar.
- Commits: `tipo(ámbito): descripción`, ej. `feat(pedidos): validar stock`.

## Antes de dar una tarea por terminada
1. Pasan los tests de cada aplicación tocada.
2. Si cambió la API, el frontend afectado está actualizado.
3. Si te has saltado alguna regla de este fichero, dilo y explica por qué.

## Base de datos
- Nombres en snake_case e inglés; tablas en plural (`users`, `orders`).
- PK: `id BIGINT GENERATED ALWAYS AS IDENTITY` (o UUID: decide uno).
- Todas las tablas: `created_at`, `updated_at` (`TIMESTAMPTZ`).
- FKs siempre con índice y nombre explícito: `fk_<tabla>_<referencia>`.
- Importes en `NUMERIC(…)`, nunca `float`/`double`.
- Migraciones Flyway en `db/migration/`; nunca modificar una ya aplicada.