#!/usr/bin/env bash
# Arranca el backend en local: levanta la BD (Docker), espera a que esté lista
# y lanza Spring Boot con el perfil "local".
#
# JWT_SECRET: si ya está exportado se usa ese; si no, se genera uno aleatorio
# para esta ejecución. Al reiniciar con otro secreto solo caducan los access
# tokens (el frontend los renueva solo con /refresh); las sesiones se mantienen.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

command -v docker >/dev/null || { echo "Error: Docker no está instalado o no está en el PATH." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "Error: Docker no está arrancado." >&2; exit 1; }

echo "→ Levantando la base de datos (localhost:5433)..."
docker compose -f "$ROOT/docker-compose.yml" up -d --wait db

if [ -z "${JWT_SECRET:-}" ]; then
  JWT_SECRET="$(openssl rand -base64 48)"
  echo "→ JWT_SECRET no definido: generado uno aleatorio para esta ejecución."
fi
export JWT_SECRET

echo "→ Arrancando el backend (perfil local) en http://localhost:8080 ..."
cd "$ROOT/backend"
exec ./mvnw spring-boot:run -Dspring-boot.run.profiles=local "$@"
