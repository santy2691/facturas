import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    expect(dated.nativeElement.querySelector('.meta').textContent).toBe(
      'Domingo, 18 de octubre de 2026',
    );
  });

  it('renders a single h1 with the greeting', () => {
    const headings = el.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toContain('Hola, Ana');
  });

  it('shows the empty state for groups, without actions', () => {
    const empty = el.querySelector('.empty')!;
    expect(empty.querySelector('mat-icon')?.textContent?.trim()).toBe('groups');
    expect(empty.querySelector('h2')?.textContent).toBe('Aún no tienes grupos');
    expect(empty.querySelector('p')?.textContent?.trim()).toBe(
      'Cuando el módulo Grupos esté disponible, podrás crear uno y repartir gastos con otras personas.',
    );
    expect(el.querySelector('button, a')).toBeNull();
  });

  it('has no tax vocabulary or invoice register', () => {
    expect(el.querySelector('table')).toBeNull();
    expect(el.textContent).not.toMatch(/IVA|Libro registro|factura/i);
  });
});
