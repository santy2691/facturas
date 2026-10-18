Tarea: $ARGUMENTS

## 1. Planificar
Usa el subagente `planificador` con la tarea anterior.

## 2. Aprobación
Muéstrame el resumen del plan, su ámbito y las dudas abiertas.
ESPERA mi aprobación. Si hay dudas abiertas, resuélvelas conmigo y pide al
planificador que actualice el plan antes de seguir.

## 3. Ejecutar según el ámbito
- backend → subagente `ejecutor-backend` con la ruta del plan.
- frontend → subagente `ejecutor-frontend` con la ruta del plan.
- ambos → primero `ejecutor-backend`. Solo si termina con `./mvnw test`
  en verde, lanza `ejecutor-frontend`. Si el backend falla, para y
  enséñame el problema.

## 4. Resumen
Qué se hizo, resultado de los tests de cada parte y qué queda pendiente.