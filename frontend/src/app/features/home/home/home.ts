import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Auth } from '../../../core/auth/auth';

const dateFormat = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Today's date in Spanish with the first letter capitalised, e.g. "Sábado, 18 de octubre de 2026". */
function formatToday(): string {
  const text = dateFormat.format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
}

@Component({
  imports: [MatButton, MatIcon, MatProgressSpinner],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly today = formatToday();
  protected readonly loggingOut = signal(false);

  protected logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    // The session is cleared and we leave even if the request fails.
    const leave = () => void this.router.navigate(['/login']);
    this.auth.logout().subscribe({ next: leave, error: leave });
  }
}
