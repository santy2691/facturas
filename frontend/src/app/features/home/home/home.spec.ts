import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatIconHarness } from '@angular/material/icon/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { Auth } from '../../../core/auth/auth';
import { Home } from './home';

describe('Home', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  let fixture: ComponentFixture<Home>;
  let router: Router;
  const logout = vi.fn();

  beforeEach(async () => {
    logout.mockReset();
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            user: signal({ id: 1, firstName: 'Ana', lastName: 'Pérez', email: 'a@x.com', role: 'USER' }),
            logout,
          },
        },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
  });

  const click = async () => {
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
  };

  it('greets the user by first name only', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Hola, Ana');
    expect(text).not.toContain('Pérez');
  });

  it('logs out and navigates to /login', async () => {
    const result = new Subject<void>();
    logout.mockReturnValue(result);
    await click();
    expect(logout).toHaveBeenCalled();
    const button = fixture.nativeElement.querySelector('button');
    expect(button.querySelector('mat-progress-spinner')).toBeTruthy();
    expect(button.getAttribute('aria-busy')).toBe('true');
    result.next();
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('navigates to /login even if logout fails', async () => {
    logout.mockReturnValue(throwError(() => new Error('network')));
    await click();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('has the sign-out button with its icon', async () => {
    expect(fixture.nativeElement.textContent).toContain('Cerrar sesión');
    const icon = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatIconHarness);
    expect(await icon.getName()).toBe('logout');
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
    const headings = fixture.nativeElement.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toContain('Hola, Ana');
  });

  it('shows the empty state', () => {
    const empty = fixture.nativeElement.querySelector('.empty');
    expect(empty.querySelector('h2').textContent).toBe('Todavía no hay nada por aquí');
    expect(empty.querySelector('p').textContent).toBe(
      'Cuando haya secciones disponibles, aparecerán en esta página.',
    );
  });

  it('keeps the logout as the only button', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toContain('Cerrar sesión');
    expect(fixture.nativeElement.querySelector('.empty a, .empty button')).toBeNull();
  });
});
