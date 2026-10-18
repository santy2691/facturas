import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginForm } from '../login-form/login-form';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const form = () => fixture.debugElement.children[0].componentInstance as LoginForm;
  const submit = () => form().submitted.emit({ email: 'Ana@x.com', password: 'abcdefg1' });

  it('navigates to /inicio after a successful login', async () => {
    submit();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ email: 'Ana@x.com', password: 'abcdefg1' });
    req.flush({
      accessToken: 't',
      expiresIn: 900,
      user: { id: 1, firstName: 'Ana', lastName: 'P', email: 'Ana@x.com', role: 'USER' },
    });
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledWith(['/inicio']);
  });

  it('shows the server message on 401 and keeps loading off', async () => {
    submit();
    http
      .expectOne('/api/auth/login')
      .flush(
        { status: 401, detail: 'Email o contraseña incorrectos' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Email o contraseña incorrectos');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows the generic message on a network error', async () => {
    submit();
    http.expectOne('/api/auth/login').error(new ProgressEvent('error'));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      'No se ha podido completar la operación. Inténtalo de nuevo más tarde.',
    );
  });

  it('shows the generic message on a 500', async () => {
    submit();
    http.expectOne('/api/auth/login').flush(
      { status: 500, detail: 'Error interno' },
      { status: 500, statusText: 'Server Error' },
    );
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No se ha podido completar');
    expect(fixture.nativeElement.textContent).not.toContain('Error interno');
  });
});
