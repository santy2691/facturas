import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Auth } from '../../../core/auth/auth';
import { RegisterRequest } from '../../../core/auth/auth.models';
import { messageFor, problemOf } from '../auth-errors';
import { RegisterForm } from '../register-form/register-form';

const FORM_FIELDS = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];

@Component({
  imports: [RegisterForm],
  selector: 'app-register',
  templateUrl: './register.html',
})
export class Register {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly fieldErrors = signal<Partial<Record<string, string>>>({});

  protected register(request: RegisterRequest): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.serverError.set(null);
    this.fieldErrors.set({});
    this.auth
      .register(request)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/inicio']),
        error: (error: unknown) => this.handleError(error),
      });
  }

  private handleError(error: unknown): void {
    const problem = problemOf(error);
    if (error instanceof HttpErrorResponse && error.status === 400 && problem) {
      const byField: Partial<Record<string, string>> = {};
      const unmapped: string[] = [];
      for (const { field, message } of problem.errors ?? []) {
        if (FORM_FIELDS.includes(field)) byField[field] ??= message;
        else unmapped.push(message);
      }
      this.fieldErrors.set(byField);
      // Errors that don't belong to a visible field still need to reach the user.
      const general = unmapped.length ? unmapped.join(' ') : null;
      this.serverError.set(general ?? (Object.keys(byField).length ? null : problem.detail));
      return;
    }
    this.serverError.set(messageFor(error));
  }
}
