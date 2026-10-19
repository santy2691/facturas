import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
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
  imports: [MatIcon],
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  protected readonly user = inject(Auth).user;
  protected readonly today = formatToday();
}
