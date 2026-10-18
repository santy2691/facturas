import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopBar } from '../top-bar/top-bar';

@Component({
  imports: [RouterOutlet, TopBar],
  selector: 'app-main-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './main-layout.scss',
  templateUrl: './main-layout.html',
})
export class MainLayout {}
