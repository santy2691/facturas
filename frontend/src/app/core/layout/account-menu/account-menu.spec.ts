import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { Auth } from '../../auth/auth';
import { UserResponse } from '../../auth/auth.models';
import { AccountMenu } from './account-menu';

describe('AccountMenu', () => {
  let fixture: ComponentFixture<AccountMenu>;
  let el: HTMLElement;
  let loader: HarnessLoader;
  let router: Router;
  const logout = vi.fn();
  const user = signal<UserResponse | null>({
    id: 1,
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@ejemplo.com',
    role: 'USER',
  });

  beforeEach(async () => {
    logout.mockReset();
    await TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [provideRouter([]), { provide: Auth, useValue: { user, logout } }],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(AccountMenu);
    el = fixture.nativeElement;
    loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    await fixture.whenStable();
  });

  const trigger = () => el.querySelector('button.trigger') as HTMLButtonElement;

  it('shows the initials and first name, with the full name as label', () => {
    expect(trigger().querySelector('.avatar')?.textContent).toBe('AP');
    expect(trigger().querySelector('.name')?.textContent).toBe('Ana');
    expect(trigger().getAttribute('aria-label')).toBe('Cuenta de Ana Pérez');
  });

  it('opens a menu with the identity and the sign-out item', async () => {
    const menu = await loader.getHarness(MatMenuHarness);
    await menu.open();
    const panel = document.querySelector('.mat-mdc-menu-panel')!;
    expect(panel.textContent).toContain('Ana Pérez');
    expect(panel.textContent).toContain('ana@ejemplo.com');
    const items = await menu.getItems();
    expect(items.length).toBe(1);
    expect(await items[0].getText()).toContain('Cerrar sesión');
  });

  it('logs out and navigates to /login, busy meanwhile', async () => {
    const result = new Subject<void>();
    logout.mockReturnValue(result);
    const menu = await loader.getHarness(MatMenuHarness);
    await menu.clickItem({ text: /Cerrar sesión/ });
    await fixture.whenStable();
    expect(logout).toHaveBeenCalled();
    expect(trigger().getAttribute('aria-busy')).toBe('true');
    expect(trigger().querySelector('mat-progress-spinner')).toBeTruthy();
    result.next();
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('navigates to /login even if logout fails', async () => {
    logout.mockReturnValue(throwError(() => new Error('network')));
    const menu = await loader.getHarness(MatMenuHarness);
    await menu.clickItem({ text: /Cerrar sesión/ });
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('renders nothing without a session', async () => {
    user.set(null);
    await fixture.whenStable();
    expect(el.querySelector('button')).toBeNull();
    user.set({
      id: 1,
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@ejemplo.com',
      role: 'USER',
    });
  });
});
