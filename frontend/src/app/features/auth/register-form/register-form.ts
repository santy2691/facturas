import { Component, computed, input, output, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  maxLength,
  required,
  SchemaPath,
  validate,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatError, MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { FormAlert } from '../../../shared/form-alert/form-alert/form-alert';
import { RegisterRequest } from '../../../core/auth/auth.models';

// At least 8 characters, one Unicode letter and one digit (same rule as the backend).
const PASSWORD_PATTERN = /^(?=.*\p{L})(?=.*\p{Nd}).{8,}$/u;

/** The same rule as PASSWORD_PATTERN, split into the parts shown to the user while typing. */
const PASSWORD_RULES: { label: string; test: (password: string) => boolean }[] = [
  { label: 'Al menos 8 caracteres', test: (password) => password.length >= 8 },
  { label: 'Una letra', test: (password) => /\p{L}/u.test(password) },
  { label: 'Un número', test: (password) => /\p{Nd}/u.test(password) },
];

/** Name fields: the backend trims them before validating, so we do too. */
function validateName(
  path: SchemaPath<string>,
  messages: { required: string; max: string },
): void {
  validate(path, ({ value }) => {
    const trimmed = value().trim();
    if (!trimmed) return { kind: 'required', message: messages.required };
    if (trimmed.length > 75) return { kind: 'maxLength', message: messages.max };
    return undefined;
  });
}

@Component({
  imports: [
    FormAlert,
    FormField,
    RouterLink,
    MatButton,
    MatError,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatProgressSpinner,
    MatSuffix,
  ],
  selector: 'app-register-form',
  styleUrl: '../auth-form.scss',
  templateUrl: './register-form.html',
})
export class RegisterForm {
  readonly loading = input(false);
  /** General error from the server (e.g. 409 email already registered). */
  readonly serverError = input<string | null>(null);
  /** Server validation errors (400) keyed by field name. */
  readonly fieldErrors = input<Partial<Record<string, string>>>({});
  readonly submitted = output<RegisterRequest>();

  protected readonly passwordMasked = signal(true);
  protected readonly confirmPasswordMasked = signal(true);

  protected readonly model = signal<RegisterRequest>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  protected readonly passwordRules = computed(() => {
    const password = this.model().password;
    return PASSWORD_RULES.map((rule) => ({ label: rule.label, met: rule.test(password) }));
  });

  protected readonly registerForm = form(this.model, (path) => {
    validateName(path.firstName, {
      required: 'El nombre es obligatorio',
      max: 'El nombre no puede superar 75 caracteres',
    });
    validateName(path.lastName, {
      required: 'Los apellidos son obligatorios',
      max: 'Los apellidos no pueden superar 75 caracteres',
    });

    required(path.email, { message: 'El email es obligatorio' });
    // Length first: Angular's email() also rejects >254 and would hide this message.
    maxLength(path.email, 254, { message: 'El email no puede superar 254 caracteres' });
    email(path.email, { message: 'Introduce un email válido' });

    validate(path.password, ({ value }) => {
      const password = value();
      if (!password) return { kind: 'required', message: 'La contraseña es obligatoria' };
      if (password.length > 64) {
        return { kind: 'maxLength', message: 'La contraseña no puede superar 64 caracteres' };
      }
      if (!PASSWORD_PATTERN.test(password)) {
        return {
          kind: 'pattern',
          message: 'La contraseña debe tener al menos 8 caracteres, una letra y un número',
        };
      }
      return undefined;
    });

    validate(path.confirmPassword, ({ value, valueOf }) => {
      const confirmation = value();
      if (!confirmation) return { kind: 'required', message: 'Confirma la contraseña' };
      if (confirmation !== valueOf(path.password)) {
        return { kind: 'mismatch', message: 'Las contraseñas no coinciden' };
      }
      return undefined;
    });
  });

  /** Same rule as the messages (client or server), so server errors also mark the field. */
  private matcherFor(name: keyof RegisterRequest): ErrorStateMatcher {
    return { isErrorState: () => this.errorOf(name) !== null };
  }

  protected readonly matchers = {
    firstName: this.matcherFor('firstName'),
    lastName: this.matcherFor('lastName'),
    email: this.matcherFor('email'),
    password: this.matcherFor('password'),
    confirmPassword: this.matcherFor('confirmPassword'),
  };

  /**
   * Client error (once the field is touched) or, failing that, the server one. The confirmation
   * also shows it while typing, as soon as it stops being the start of the password.
   */
  protected errorOf(name: keyof RegisterRequest): string | null {
    const state = this.registerForm[name]();
    const clientError =
      state.touched() || (name === 'confirmPassword' && this.confirmationDiverges())
        ? state.errors()[0]?.message
        : undefined;
    return clientError ?? this.fieldErrors()[name] ?? null;
  }

  private confirmationDiverges(): boolean {
    const { password, confirmPassword } = this.model();
    return confirmPassword !== '' && !password.startsWith(confirmPassword);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.loading()) return;
    this.registerForm().markAsTouched();
    if (this.registerForm().invalid()) return;
    // The email is sent exactly as typed (no trim, no lowercase).
    this.submitted.emit({ ...this.model() });
  }
}
