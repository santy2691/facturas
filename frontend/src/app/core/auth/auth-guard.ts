import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

/** Lets authenticated users through; anyone else goes to /login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  return auth.isAuthenticated() || inject(Router).createUrlTree(['/login']);
};

/** For login/register: authenticated users go to /inicio. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  return !auth.isAuthenticated() || inject(Router).createUrlTree(['/inicio']);
};
