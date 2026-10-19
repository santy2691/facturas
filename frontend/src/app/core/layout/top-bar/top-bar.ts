import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatToolbar } from '@angular/material/toolbar';
import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle/theme-toggle';
import { AccountMenu } from '../account-menu/account-menu';
import { ModuleNav } from '../module-nav/module-nav';

@Component({
  imports: [AccountMenu, MatToolbar, ModuleNav, ThemeToggle],
  selector: 'app-top-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './top-bar.scss',
  templateUrl: './top-bar.html',
})
export class TopBar {}
