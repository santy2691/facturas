import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Auth } from '../../auth/auth';
import { MODULES } from './modules';

@Component({
  imports: [
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    RouterLink,
    RouterLinkActive,
  ],
  selector: 'app-module-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './module-nav.scss',
  templateUrl: './module-nav.html',
})
export class ModuleNav {
  protected readonly user = inject(Auth).user;
  protected readonly modules = MODULES;
}
