import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { Auth } from './auth';

const isProtectedApiUrl = (url: string): boolean =>
  url.startsWith('/api/') && !url.startsWith('/api/auth/');

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isProtectedApiUrl(req.url)) {
    return next(req);
  }

  const auth = inject(Auth);
  const router = inject(Router);
  const withToken = (token: string | null) =>
    token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(withToken(auth.token())).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      // A single refresh (shared between concurrent requests), then one retry.
      // The retry is outside the inner catchError, so its own 401 is not refreshed again.
      return auth.refresh().pipe(
        catchError(() => {
          auth.clear();
          void router.navigate(['/login']);
          return throwError(() => error);
        }),
        switchMap((token) => next(withToken(token))),
      );
    }),
  );
};
