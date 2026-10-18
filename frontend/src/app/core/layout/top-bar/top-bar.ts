import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatToolbar } from '@angular/material/toolbar';
import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle/theme-toggle';
import { AccountMenu } from '../account-menu/account-menu';

@Component({
  imports: [AccountMenu, MatToolbar, ThemeToggle],
  selector: 'app-top-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './top-bar.scss',
  templateUrl: './top-bar.html',
})
export class TopBar {}
