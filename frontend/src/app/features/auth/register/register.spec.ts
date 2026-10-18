import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RegisterRequest } from '../../../core/auth/auth.models';
import { RegisterForm } from '../register-form/register-form';
import { Register } from './register';

const request: RegisterRequest = {
  firstName: 'Ana',
  lastName: 'Pérez',
  email: 'Ana@x.com',
  password: 'abcdefg1',
  confirmPassword: 'abcdefg1',
};

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Register);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const submit = () =>
    (fixture.debugElement.children[0].componentInstance as RegisterForm).submitted.emit(request);
  const text = () => fixture.nativeElement.textContent as string;

  it('navigates to /inicio after a successful registration', async () => {
    submit();
    const req = http.expectOne('/api/auth/register');
    expect(req.request.body).toEqual(request);
    req.flush(
      {
        accessToken: 't',
        expiresIn: 900,
        user: { id: 1, firstName: 'Ana', lastName: 'Pérez', email: 'Ana@x.com', role: 'USER' },
      },
      { status: 201, statusText: 'Created' },
    );
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledWith(['/inicio']);
  });

  it('maps 400 errors to their fields, including lastName', async () => {
    submit();
    http.expectOne('/api/auth/register').flush(
      {
        status: 400,
        detail: 'Hay errores en el formulario',
        errors: [
          { field: 'lastName', message: 'Los apellidos son obligatorios' },
          { field: 'password', message: 'La contraseña es demasiado larga' },
        ],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();
    expect(text()).toContain('Los apellidos son obligatorios');
    expect(text()).toContain('La contraseña es demasiado larga');
    expect(text()).not.toContain('Hay errores en el formulario');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows the 409 detail in a message', async () => {
    submit();
    http.expectOne('/api/auth/register').flush(
      { status: 409, detail: 'Ya existe una cuenta con este email' },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Ya existe una cuenta con este email',
    );
  });

  it('shows the generic message on a 500', async () => {
    submit();
    http.expectOne('/api/auth/register').flush(
      { status: 500, detail: 'Error interno' },
      { status: 500, statusText: 'Server Error' },
    );
    await fixture.whenStable();
    expect(text()).toContain('No se ha podido completar la operación.');
  });
});
