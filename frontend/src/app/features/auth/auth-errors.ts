import { HttpErrorResponse } from '@angular/common/http';
import { ApiProblem } from '../../core/auth/auth.models';

export const GENERIC_ERROR =
  'No se ha podido completar la operación. Inténtalo de nuevo más tarde.';

/** Returns the ProblemDetail body of an HTTP error, if it has the expected shape. */
export function problemOf(error: unknown): ApiProblem | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body = error.error as Partial<ApiProblem> | null;
  return body && typeof body.detail === 'string' ? (body as ApiProblem) : null;
}

/** Message to show for 401/409 (the server text); anything else gets the generic one. */
export function messageFor(error: unknown): string {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  const problem = problemOf(error);
  return (status === 401 || status === 409) && problem ? problem.detail : GENERIC_ERROR;
}
