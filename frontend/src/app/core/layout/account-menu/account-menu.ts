import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Auth } from '../../auth/auth';

@Component({
  imports: [MatButton, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger, MatProgressSpinner],
  selector: 'app-account-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './account-menu.scss',
  templateUrl: './account-menu.html',
})
export class AccountMenu {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly fullName = computed(() => {
    const user = this.user();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });
  protected readonly initials = computed(() => {
    const user = this.user();
    return user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() : '';
  });
  protected readonly loggingOut = signal(false);

  protected logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    // The session is cleared and we leave even if the request fails.
    const leave = () => void this.router.navigate(['/login']);
    this.auth.logout().subscribe({ next: leave, error: leave });
  }
}
