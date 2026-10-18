import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatTableHarness } from '@angular/material/table/testing';
import { Auth } from '../../../core/auth/auth';
import { Home } from './home';

describe('Home', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  let fixture: ComponentFixture<Home>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        {
          provide: Auth,
          useValue: {
            user: signal({ id: 1, firstName: 'Ana', lastName: 'Pérez', email: 'a@x.com', role: 'USER' }),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Home);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('greets the user by first name only', () => {
    expect(el.textContent).toContain('Hola, Ana');
    expect(el.textContent).not.toContain('Pérez');
  });

  it("shows today's date in Spanish", async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 18));
    const dated = TestBed.createComponent(Home);
    await dated.whenStable();
    expect(dated.nativeElement.querySelector('.page-heading .meta').textContent).toBe(
      'Domingo, 18 de octubre de 2026',
    );
  });

  it('renders a single h1 with the greeting', () => {
    const headings = el.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toContain('Hola, Ana');
  });

  it('has no buttons or links: sign-out lives in the account menu', () => {
    expect(el.querySelector('button, a')).toBeNull();
  });

  it('shows the register for the current year', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 18));
    const dated = TestBed.createComponent(Home);
    await dated.whenStable();
    const ledger = dated.nativeElement.querySelector('.ledger');
    expect(ledger.querySelector('h2').textContent).toBe('Libro registro');
    expect(ledger.textContent).toContain('Ejercicio 2026');
  });

  it('shows the register columns and no rows', async () => {
    const table = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatTableHarness);
    const [header] = await table.getHeaderRows();
    expect(await header.getCellTextByIndex()).toEqual([
      'Nº',
      'Fecha',
      'Cliente',
      'Base',
      'IVA',
      'Total',
      'Estado',
    ]);
    expect(await table.getRows()).toEqual([]);
  });

  it('shows the empty state inside the table', () => {
    const empty = el.querySelector('td.empty')!;
    expect(empty.getAttribute('colspan')).toBe('7');
    expect(empty.querySelector('h3')?.textContent).toBe('Aún no hay facturas');
    expect(empty.querySelector('p')?.textContent).toBe(
      'Cuando emitas la primera, aparecerá aquí ordenada por serie y número.',
    );
  });

  it('shows a zero total for the year', async () => {
    const table = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatTableHarness);
    const [footer] = await table.getFooterRows();
    const cells = (await footer.getCellTextByIndex()).map((text) => text.replace(/\s/g, ' '));
    expect(cells).toEqual(['Total del ejercicio', '0,00 €', '']);
  });
});
