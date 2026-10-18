import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from './auth';
import { AuthResponse } from './auth.models';
import { authInterceptor } from './auth-interceptor';

const session = (token: string): AuthResponse => ({
  accessToken: token,
  expiresIn: 900,
  user: { id: 1, firstName: 'Ana', lastName: 'Pérez', email: 'a@x.com', role: 'USER' },
});
const unauthorized = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: Auth;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(Auth);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => controller.verify());

  const loginWith = (token: string) => {
    auth.login({ email: 'a@x.com', password: 'x' }).subscribe();
    controller.expectOne('/api/auth/login').flush(session(token));
  };

  it('adds the Bearer header to API requests when there is a token', () => {
    loginWith('t1');
    http.get('/api/invoices').subscribe();
    const req = controller.expectOne('/api/invoices');
    expect(req.request.headers.get('Authorization')).toBe('Bearer t1');
    req.flush([]);
  });

  it('does not add the header without a token', () => {
    http.get('/api/invoices').subscribe();
    const req = controller.expectOne('/api/invoices');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('does not add the header to /api/auth/* or other URLs', () => {
    loginWith('t1');
    http.post('/api/auth/logout', null).subscribe();
    expect(controller.expectOne('/api/auth/logout').request.headers.has('Authorization')).toBe(false);
    http.get('/assets/x.json').subscribe();
    expect(controller.expectOne('/assets/x.json').request.headers.has('Authorization')).toBe(false);
  });

  it('on 401 refreshes once and retries with the new token', () => {
    loginWith('old');
    let body: unknown;
    http.get('/api/invoices').subscribe((b) => (body = b));

    controller.expectOne('/api/invoices').flush({}, unauthorized);
    controller.expectOne('/api/auth/refresh').flush(session('new'));
    const retry = controller.expectOne('/api/invoices');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new');
    retry.flush({ ok: true });

    expect(body).toEqual({ ok: true });
  });

  it('two requests failing with 401 trigger a single refresh', () => {
    loginWith('old');
    http.get('/api/a').subscribe();
    http.get('/api/b').subscribe();

    controller.expectOne('/api/a').flush({}, unauthorized);
    controller.expectOne('/api/b').flush({}, unauthorized);
    controller.expectOne('/api/auth/refresh').flush(session('new'));

    controller.expectOne('/api/a').flush({});
    controller.expectOne('/api/b').flush({});
  });

  it('when refresh fails clears the session, goes to /login and propagates the error', () => {
    loginWith('old');
    let status = 0;
    http.get('/api/invoices').subscribe({ error: (e) => (status = e.status) });

    controller.expectOne('/api/invoices').flush({}, unauthorized);
    controller.expectOne('/api/auth/refresh').flush({}, unauthorized);

    expect(status).toBe(401);
    expect(auth.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('a 401 on /api/auth/login does not trigger a refresh', () => {
    let status = 0;
    http.post('/api/auth/login', {}).subscribe({ error: (e) => (status = e.status) });
    controller.expectOne('/api/auth/login').flush({}, unauthorized);
    expect(status).toBe(401);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('a 401 on the retry does not refresh again', () => {
    loginWith('old');
    let status = 0;
    http.get('/api/invoices').subscribe({ error: (e) => (status = e.status) });

    controller.expectOne('/api/invoices').flush({}, unauthorized);
    controller.expectOne('/api/auth/refresh').flush(session('new'));
    controller.expectOne('/api/invoices').flush({}, unauthorized);

    expect(status).toBe(401);
  });

  it('does not refresh on non-401 errors', () => {
    loginWith('t1');
    let status = 0;
    http.get('/api/invoices').subscribe({ error: (e) => (status = e.status) });
    controller.expectOne('/api/invoices').flush({}, { status: 500, statusText: 'Server Error' });
    expect(status).toBe(500);
  });
});
