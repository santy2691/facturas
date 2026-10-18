import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Auth } from './core/auth/auth';
import { routes } from './app.routes';

describe('routes', () => {
  const user = signal<unknown>(null);

  beforeEach(() => {
    user.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Auth, useValue: { user, isAuthenticated: () => user() !== null } },
      ],
    });
  });

  const signIn = () =>
    user.set({ id: 1, firstName: 'Ana', lastName: 'Pérez', email: 'a@x.com', role: 'USER' });

  async function open(url: string): Promise<{ harness: RouterTestingHarness; path: string }> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
    return { harness, path: TestBed.inject(Router).url };
  }

  it.each(['/inicio', '/', '/loquesea'])('without a session %s goes to /login', async (url) => {
    expect((await open(url)).path).toBe('/login');
  });

  it('without a session /registro is reachable', async () => {
    expect((await open('/registro')).path).toBe('/registro');
  });

  it.each(['/login', '/registro', '/', '/loquesea'])(
    'with a session %s goes to /inicio',
    async (url) => {
      signIn();
      expect((await open(url)).path).toBe('/inicio');
    },
  );

  it('/inicio renders inside the main layout', async () => {
    signIn();
    const { harness } = await open('/inicio');
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-main-layout app-home')).toBeTruthy();
    expect(root.textContent).toContain('Hola, Ana');
  });

  it('/login renders the auth layout with the shared top bar, not the main layout', async () => {
    const { harness } = await open('/login');
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-main-layout')).toBeNull();
    expect(root.querySelector('app-auth-layout app-top-bar')).toBeTruthy();
    expect(root.querySelector('app-auth-layout app-login')).toBeTruthy();
  });
});
