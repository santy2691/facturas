import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Auth } from './auth';
import { authGuard, guestGuard } from './auth-guard';

describe('auth guards', () => {
  const authenticated = signal(false);

  beforeEach(() => {
    authenticated.set(false);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Auth, useValue: { isAuthenticated: authenticated } }],
    });
  });

  const run = (guard: typeof authGuard) =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  const asPath = (result: unknown) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  it('authGuard redirects to /login without a session', () => {
    expect(asPath(run(authGuard))).toBe('/login');
  });

  it('authGuard allows access with a session', () => {
    authenticated.set(true);
    expect(run(authGuard)).toBe(true);
  });

  it('guestGuard allows access without a session', () => {
    expect(run(guestGuard)).toBe(true);
  });

  it('guestGuard redirects to /inicio with a session', () => {
    authenticated.set(true);
    expect(asPath(run(guestGuard))).toBe('/inicio');
  });
});
