import { Component, input, output, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatError, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { FormAlert } from '../../../shared/form-alert/form-alert/form-alert';
import { LoginRequest } from '../../../core/auth/auth.models';

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
  selector: 'app-login-form',
  styleUrl: '../auth-form.scss',
  templateUrl: './login-form.html',
})
export class LoginForm {
  readonly loading = input(false);
  readonly serverError = input<string | null>(null);
  readonly submitted = output<LoginRequest>();

  protected readonly passwordMasked = signal(true);

  protected readonly model = signal<LoginRequest>({ email: '', password: '' });
  protected readonly loginForm = form(this.model, (path) => {
    required(path.email, { message: 'El email es obligatorio' });
    email(path.email, { message: 'Introduce un email válido' });
    required(path.password, { message: 'La contraseña es obligatoria' });
  });

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.loading()) return;
    this.loginForm().markAsTouched();
    if (this.loginForm().invalid()) return;
    // The email is sent exactly as typed (no trim, no lowercase).
    this.submitted.emit({ ...this.model() });
  }
}
