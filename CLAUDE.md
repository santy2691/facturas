# proyecto facturas

## Contexto
creacion de nueva aplicacion, donde primero se empezar creando el sistema de login y registro de usuario


## Glosario
 - **Usuario**: persona registrada que accede a la aplicación.

## Aplicaciones
- **backend/**: API REST. Única fuente de verdad y de reglas de negocio.
- **frontend/**: aplicación web que consume la API.
<!-- Si hay más de un frontal, añade una línea por cada uno con sus usuarios. -->

Monorepo: un único repo git en la raíz que contiene ambas aplicaciones.
Un cambio que afecte a backend y frontend va en el mismo commit/PR.
Cada aplicación tiene su propio CLAUDE.md, donde están las convenciones
técnicas detalladas.

## Stack
- Backend: Java 25, Spring Boot 4.1, Maven
- Autenticación: Spring Security con JWT (access token + refresh token)
- Base de datos: PostgreSQL (Docker en local), migraciones con Flyway
- Frontend: Angular 22 (standalone, signals, OnPush por defecto), SCSS, Angular Material 22 (tema M3) y Material Symbols
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
- Contrato de la API: `http://localhost:8080/v3/api-docs` con el backend arrancado
  en perfil `local` (springdoc está desactivado en el resto de perfiles).


## Arrancar el entorno
- BD: `docker compose up -d db` (desde la raíz; `docker-compose.yml` está ahí).
  Expuesta en `localhost:5433` (no 5432) para no chocar con un PostgreSQL local.
- Backend (y BD): `./start-backend-local.sh` desde la raíz. Levanta la BD, espera a
  que esté lista y arranca con perfil `local`; usa `JWT_SECRET` si está exportado o
  genera uno aleatorio. A mano: `cd backend && export JWT_SECRET=$(openssl rand -base64 48) && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local`
  (`JWT_SECRET` es obligatoria; detalles en `backend/CLAUDE.md`)
- Frontend: `cd frontend && npm start` → http://localhost:4200

## Principios comunes
- Código en inglés; textos al usuario en español.
- Prioridad si chocan: claridad > KISS/YAGNI > SOLID.
- No añadir abstracciones "por si acaso" ni dependencias nuevas sin preguntar.


## Antes de dar una tarea por terminada
1. Pasan los tests de cada aplicación tocada.
2. Si cambió la API, el frontend afectado está actualizado.
3. Si te has saltado alguna regla de este fichero, dilo y explica por qué.
