import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { Auth } from '../../../core/auth/auth';

const dateFormat = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

/** Today's date in Spanish with the first letter capitalised, e.g. "Sábado, 18 de octubre de 2026". */
function formatToday(): string {
  const text = dateFormat.format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
}

@Component({
  imports: [MatIcon, MatTableModule],
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  protected readonly user = inject(Auth).user;
  protected readonly today = formatToday();
  protected readonly year = new Date().getFullYear();

  // There is no invoices API yet: the register is always empty.
  protected readonly invoices: never[] = [];
  protected readonly columns = ['number', 'date', 'client', 'base', 'vat', 'total', 'status'];
  protected readonly footerColumns = ['totalLabel', 'totalAmount', 'totalEnd'];
  protected readonly total = euros.format(0);
}
