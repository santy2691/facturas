import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { provideRouter } from '@angular/router';
import { LoginRequest } from '../../../core/auth/auth.models';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  let fixture: ComponentFixture<LoginForm>;
  let el: HTMLElement;
  let emitted: LoginRequest[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginForm],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginForm);
    emitted = [];
    fixture.componentInstance.submitted.subscribe((v) => emitted.push(v));
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  const input = (selector: string) => el.querySelector(selector) as HTMLInputElement;

  async function type(selector: string, value: string): Promise<void> {
    const control = input(selector);
    control.value = value;
    control.dispatchEvent(new Event('input'));
    control.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('shows the heading without a card', () => {
    expect(el.querySelector('.eyebrow')?.textContent).toBe('Acceso');
    expect(el.querySelector('h1')?.textContent).toBe('Iniciar sesión');
    expect(el.querySelector('mat-card')).toBeNull();
  });

  it('toggles the password mask with the eye button', async () => {
    const toggle = el.querySelector('.mask-toggle') as HTMLButtonElement;
    expect(input('#login-password').type).toBe('password');
    expect(toggle.getAttribute('aria-label')).toBe('Mostrar contraseña');
    expect(toggle.querySelector('mat-icon')?.textContent?.trim()).toBe('visibility');

    toggle.click();
    await fixture.whenStable();
    expect(input('#login-password').type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Ocultar contraseña');
    expect(toggle.querySelector('mat-icon')?.textContent?.trim()).toBe('visibility_off');
  });

  it('shows required errors on submit and does not emit', async () => {
    await submit();
    expect(el.textContent).toContain('El email es obligatorio');
    expect(el.textContent).toContain('La contraseña es obligatoria');
    expect(emitted).toEqual([]);

    const fields = await TestbedHarnessEnvironment.loader(fixture).getAllHarnesses(
      MatFormFieldHarness,
    );
    expect(await fields[0].getTextErrors()).toEqual(['El email es obligatorio']);
    expect(await fields[1].getTextErrors()).toEqual(['La contraseña es obligatoria']);
    // Material leaves aria-invalid unset on empty required inputs; the error is linked instead.
    expect(input('#login-email').getAttribute('aria-describedby')).toBeTruthy();
    expect(input('#login-password').getAttribute('aria-describedby')).toBeTruthy();
  });

  it('shows the invalid email error after touching the field', async () => {
    await type('#login-email', 'no-es-email');
    expect(el.textContent).toContain('Introduce un email válido');
    expect(input('#login-email').getAttribute('aria-invalid')).toBe('true');
  });

  it('emits the credentials with the email unmodified', async () => {
    await type('#login-email', 'Ana@Ejemplo.com');
    await type('#login-password', 'abcdefg1');
    await submit();
    expect(emitted).toEqual([{ email: 'Ana@Ejemplo.com', password: 'abcdefg1' }]);
  });

  it('shows the server error', async () => {
    fixture.componentRef.setInput('serverError', 'Email o contraseña incorrectos');
    await fixture.whenStable();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Email o contraseña incorrectos');
  });

  it('does not emit while loading', async () => {
    await type('#login-email', 'a@x.com');
    await type('#login-password', 'abcdefg1');
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();
    await submit();
    expect(emitted).toEqual([]);

    const submitButton = el.querySelector('button.submit') as HTMLButtonElement;
    expect(submitButton.getAttribute('aria-busy')).toBe('true');
    expect(submitButton.getAttribute('aria-disabled')).toBe('true');
    expect(submitButton.querySelector('mat-progress-spinner')).toBeTruthy();
  });

  it('links to the register page', () => {
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/registro');
  });

  it('renders the title as the page h1', () => {
    const headings = el.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toContain('Iniciar sesión');
  });

  it('does not render the alert without a server error', () => {
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });
});
