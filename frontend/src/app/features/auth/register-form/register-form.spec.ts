import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { provideRouter } from '@angular/router';
import { RegisterRequest } from '../../../core/auth/auth.models';
import { RegisterForm } from './register-form';

describe('RegisterForm', () => {
  let fixture: ComponentFixture<RegisterForm>;
  let el: HTMLElement;
  let emitted: RegisterRequest[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterForm],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(RegisterForm);
    emitted = [];
    fixture.componentInstance.submitted.subscribe((v) => emitted.push(v));
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  async function type(name: string, value: string): Promise<void> {
    const control = el.querySelector(`#register-${name}`) as HTMLInputElement;
    control.value = value;
    control.dispatchEvent(new Event('input'));
    control.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function fillValid(overrides: Partial<RegisterRequest> = {}): Promise<void> {
    const values: RegisterRequest = {
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'Ana@Ejemplo.com',
      password: 'abcdefg1',
      confirmPassword: 'abcdefg1',
      ...overrides,
    };
    for (const [name, value] of Object.entries(values)) await type(name, value);
  }

  async function submit(): Promise<void> {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  const text = () => el.textContent ?? '';
  const PASSWORD_RULE = 'La contraseña debe tener al menos 8 caracteres, una letra y un número';

  const rules = () =>
    Array.from(el.querySelectorAll('#password-rules li')).map((li) => ({
      text: li.querySelector('span')?.textContent,
      met: li.classList.contains('met'),
    }));

  it('shows the heading without a card and groups the fields', () => {
    expect(el.querySelector('.eyebrow')?.textContent).toBe('Alta de usuario');
    expect(el.querySelector('mat-card')).toBeNull();
    const legends = Array.from(el.querySelectorAll('fieldset legend')).map((l) => l.textContent);
    expect(legends).toEqual(['Datos personales', 'Acceso']);
    const [personal, access] = Array.from(el.querySelectorAll('fieldset'));
    expect(personal.querySelector('#register-email')).toBeTruthy();
    expect(access.querySelector('#register-password')).toBeTruthy();
    expect(access.querySelector('#register-confirmPassword')).toBeTruthy();
  });

  it('lists the password requirements, all pending at first', () => {
    expect(rules()).toEqual([
      { text: 'Al menos 8 caracteres', met: false },
      { text: 'Una letra', met: false },
      { text: 'Un número', met: false },
    ]);
    const password = el.querySelector('#register-password')!;
    expect(password.getAttribute('aria-describedby')).toContain('password-rules');
    expect(el.querySelector('#password-rules')?.getAttribute('aria-live')).toBe('polite');
  });

  it('marks each requirement as the password is typed', async () => {
    await type('password', 'á1');
    expect(rules().map((rule) => rule.met)).toEqual([false, true, true]);
    await type('password', 'abcdefgh');
    expect(rules().map((rule) => rule.met)).toEqual([true, true, false]);
    await type('password', 'abcdefg1');
    expect(rules().map((rule) => rule.met)).toEqual([true, true, true]);
    expect(el.querySelector('#password-rules li.met mat-icon')?.textContent?.trim()).toBe('check');
  });

  it('warns about a mismatch while typing the confirmation, not before', async () => {
    await type('password', 'abcdefg1');
    const confirmation = el.querySelector('#register-confirmPassword') as HTMLInputElement;
    const typeOnly = async (value: string) => {
      confirmation.value = value;
      confirmation.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    await typeOnly('abc');
    expect(text()).not.toContain('Las contraseñas no coinciden');
    await typeOnly('abx');
    expect(text()).toContain('Las contraseñas no coinciden');
    await typeOnly('abcdefg1');
    expect(text()).not.toContain('Las contraseñas no coinciden');
  });

  it('shows the title and labels in order', () => {
    expect(text()).toContain('Crear cuenta');
    const labels = Array.from(el.querySelectorAll('label')).map((l) => l.textContent?.trim());
    expect(labels).toEqual(['Nombre', 'Apellidos', 'Email', 'Contraseña', 'Confirmar contraseña']);
  });

  it('shows every required error on submit and does not emit', async () => {
    await submit();
    expect(text()).toContain('El nombre es obligatorio');
    expect(text()).toContain('Los apellidos son obligatorios');
    expect(text()).toContain('El email es obligatorio');
    expect(text()).toContain('La contraseña es obligatoria');
    expect(text()).toContain('Confirma la contraseña');
    expect(emitted).toEqual([]);
  });

  it('emits valid data with the email untouched', async () => {
    await fillValid();
    await submit();
    expect(emitted).toEqual([
      {
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'Ana@Ejemplo.com',
        password: 'abcdefg1',
        confirmPassword: 'abcdefg1',
      },
    ]);
  });

  it('rejects names made only of spaces', async () => {
    await fillValid({ firstName: '   ', lastName: '   ' });
    await submit();
    expect(text()).toContain('El nombre es obligatorio');
    expect(text()).toContain('Los apellidos son obligatorios');
    expect(emitted).toEqual([]);
  });

  it('accepts names of 75 characters and rejects 76', async () => {
    await fillValid({ firstName: 'a'.repeat(75), lastName: 'b'.repeat(75) });
    await submit();
    expect(emitted.length).toBe(1);

    await fillValid({ firstName: 'a'.repeat(76), lastName: 'b'.repeat(76) });
    await submit();
    expect(text()).toContain('El nombre no puede superar 75 caracteres');
    expect(text()).toContain('Los apellidos no pueden superar 75 caracteres');
    expect(emitted.length).toBe(1);
  });

  it('validates the email format and length', async () => {
    await type('email', 'no-es-email');
    expect(text()).toContain('Introduce un email válido');
    const tooLong = 'a@' + [60, 60, 60, 60, 9].map((n) => 'b'.repeat(n)).join('.');
    expect(tooLong.length).toBe(255);
    await type('email', tooLong);
    expect(text()).toContain('El email no puede superar 254 caracteres');
  });

  it.each([
    ['abc123', true],
    ['abcdef1', true],
    ['abcdefgh', true],
    ['12345678', true],
    ['abcdefg1', false],
    ['contraseña1', false],
  ])('password %s -> rule error %s', async (password, hasError) => {
    await fillValid({ password, confirmPassword: password });
    expect(text().includes(PASSWORD_RULE)).toBe(hasError);
  });

  it('accepts a 64-character password and rejects 65', async () => {
    const ok = 'a'.repeat(63) + '1';
    await fillValid({ password: ok, confirmPassword: ok });
    expect(text()).not.toContain('no puede superar 64');
    const long = 'a'.repeat(64) + '1';
    await fillValid({ password: long, confirmPassword: long });
    expect(text()).toContain('La contraseña no puede superar 64 caracteres');
    expect(text()).not.toContain(PASSWORD_RULE);
  });

  it('reports mismatching passwords on confirmPassword', async () => {
    await fillValid({ confirmPassword: 'abcdefg2' });
    expect(text()).toContain('Las contraseñas no coinciden');
    await submit();
    expect(emitted).toEqual([]);
  });

  it('shows server field errors next to their field', async () => {
    fixture.componentRef.setInput('fieldErrors', {
      lastName: 'Los apellidos son obligatorios',
      password: 'La contraseña es demasiado larga',
    });
    await fixture.whenStable();
    expect(text()).toContain('Los apellidos son obligatorios');
    expect(text()).toContain('La contraseña es demasiado larga');

    const fields = await TestbedHarnessEnvironment.loader(fixture).getAllHarnesses(
      MatFormFieldHarness,
    );
    expect(await fields[1].getTextErrors()).toEqual(['Los apellidos son obligatorios']);
    expect(await fields[3].getTextErrors()).toEqual(['La contraseña es demasiado larga']);
    const lastName = el.querySelector('#register-lastName') as HTMLInputElement;
    const password = el.querySelector('#register-password') as HTMLInputElement;
    expect(lastName.getAttribute('aria-invalid')).toBe('true');
    expect(password.getAttribute('aria-invalid')).toBe('true');
  });

  it('shows the general server error in an alert', async () => {
    fixture.componentRef.setInput('serverError', 'Ya existe una cuenta con este email');
    await fixture.whenStable();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Ya existe una cuenta con este email',
    );
  });

  it('toggles each password mask independently', async () => {
    const [first, second] = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.mask-toggle'),
    );
    const password = el.querySelector('#register-password') as HTMLInputElement;
    const confirmation = el.querySelector('#register-confirmPassword') as HTMLInputElement;
    expect(password.type).toBe('password');
    expect(confirmation.type).toBe('password');

    first.click();
    await fixture.whenStable();
    expect(password.type).toBe('text');
    expect(confirmation.type).toBe('password');
    expect(first.getAttribute('aria-label')).toBe('Ocultar contraseña');
    expect(second.getAttribute('aria-label')).toBe('Mostrar contraseña');

    second.click();
    await fixture.whenStable();
    expect(confirmation.type).toBe('text');
    first.click();
    await fixture.whenStable();
    expect(password.type).toBe('password');
    expect(confirmation.type).toBe('text');
  });

  it('links to the login page', () => {
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/login');
  });

  it('renders the title as the page h1', () => {
    const headings = el.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toContain('Crear cuenta');
  });

  it('does not render the alert without a server error', () => {
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });
});
