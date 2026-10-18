import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Auth } from './auth';
import { AuthResponse } from './auth.models';

const response: AuthResponse = {
  accessToken: 'token-1',
  expiresIn: 900,
  user: { id: 1, firstName: 'Ana', lastName: 'Pérez', email: 'Ana@x.com', role: 'USER' },
};

describe('Auth', () => {
  let auth: Auth;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(Auth);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts unauthenticated', () => {
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.user()).toBeNull();
    expect(auth.token()).toBeNull();
  });

  it('register posts the request and stores the session', () => {
    const request = {
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'Ana@x.com',
      password: 'abcdefg1',
      confirmPassword: 'abcdefg1',
    };
    let result: unknown;
    auth.register(request).subscribe((user) => (result = user));

    const req = http.expectOne('/api/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(response, { status: 201, statusText: 'Created' });

    expect(result).toEqual(response.user);
    expect(auth.user()).toEqual(response.user);
    expect(auth.token()).toBe('token-1');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('login posts the credentials and stores the session', () => {
    auth.login({ email: 'Ana@x.com', password: 'abcdefg1' }).subscribe();

    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'Ana@x.com', password: 'abcdefg1' });
    req.flush(response);

    expect(auth.user()?.firstName).toBe('Ana');
    expect(auth.token()).toBe('token-1');
  });

  it('login failure does not store a session', () => {
    let status = 0;
    auth.login({ email: 'a@x.com', password: 'x' }).subscribe({ error: (e) => (status = e.status) });
    http.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(status).toBe(401);
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('refresh posts without body and stores the new token', () => {
    let token = '';
    auth.refresh().subscribe((t) => (token = t));
    const req = http.expectOne('/api/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(response);
    expect(token).toBe('token-1');
    expect(auth.token()).toBe('token-1');
  });

  it('refresh 401 clears the session', () => {
    auth.login({ email: 'a@x.com', password: 'x' }).subscribe();
    http.expectOne('/api/auth/login').flush(response);
    expect(auth.isAuthenticated()).toBe(true);

    let failed = false;
    auth.refresh().subscribe({ error: () => (failed = true) });
    http.expectOne('/api/auth/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token()).toBeNull();
  });

  it('shares a single request between simultaneous refresh calls', () => {
    const tokens: string[] = [];
    auth.refresh().subscribe((t) => tokens.push(t));
    auth.refresh().subscribe((t) => tokens.push(t));

    http.expectOne('/api/auth/refresh').flush(response);

    expect(tokens).toEqual(['token-1', 'token-1']);
  });

  it('allows a new refresh once the previous one finished', () => {
    auth.refresh().subscribe();
    http.expectOne('/api/auth/refresh').flush(response);
    auth.refresh().subscribe();
    http.expectOne('/api/auth/refresh').flush(response);
  });

  it('restoreSession stores the session when refresh succeeds', async () => {
    const promise = auth.restoreSession();
    http.expectOne('/api/auth/refresh').flush(response);
    await promise;
    expect(auth.user()).toEqual(response.user);
  });

  it('restoreSession resolves even when refresh fails', async () => {
    const promise = auth.restoreSession();
    http.expectOne('/api/auth/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });
    await expect(promise).resolves.toBeUndefined();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('logout calls the API and clears the session', () => {
    auth.login({ email: 'a@x.com', password: 'x' }).subscribe();
    http.expectOne('/api/auth/login').flush(response);

    let done = false;
    auth.logout().subscribe(() => (done = true));
    const req = http.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(done).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token()).toBeNull();
  });

  it('logout clears the session even on a network error', () => {
    auth.login({ email: 'a@x.com', password: 'x' }).subscribe();
    http.expectOne('/api/auth/login').flush(response);

    let failed = false;
    auth.logout().subscribe({ error: () => (failed = true) });
    http.expectOne('/api/auth/logout').error(new ProgressEvent('error'));

    expect(failed).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token()).toBeNull();
  });

  it('never writes the token to web storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    auth.login({ email: 'a@x.com', password: 'x' }).subscribe();
    http.expectOne('/api/auth/login').flush(response);
    auth.refresh().subscribe();
    http.expectOne('/api/auth/refresh').flush(response);

    expect(setItem.mock.calls.some((args) => args.includes('token-1'))).toBe(false);
    setItem.mockRestore();
  });
});
