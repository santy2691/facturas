import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Auth } from '../../../core/auth/auth';
import { LoginRequest } from '../../../core/auth/auth.models';
import { messageFor } from '../auth-errors';
import { LoginForm } from '../login-form/login-form';

@Component({
  imports: [LoginForm],
  selector: 'app-login',
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected login(request: LoginRequest): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.serverError.set(null);
    this.auth
      .login(request)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/inicio']),
        error: (error: unknown) => this.serverError.set(messageFor(error)),
      });
  }
}
