import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Auth } from '../../auth/auth';
import { UserResponse } from '../../auth/auth.models';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  let fixture: ComponentFixture<TopBar>;
  let el: HTMLElement;
  const user = signal<UserResponse | null>(null);

  beforeEach(async () => {
    user.set(null);
    await TestBed.configureTestingModule({
      imports: [TopBar],
      providers: [provideRouter([]), { provide: Auth, useValue: { user } }],
    }).compileComponents();
    fixture = TestBed.createComponent(TopBar);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('shows the brand', () => {
    expect(el.textContent).toContain('Facturas');
  });

  it('contains the theme toggle', () => {
    expect(el.querySelector('app-theme-toggle')).toBeTruthy();
  });

  it('has a single header that contains the toolbar', () => {
    expect(el.querySelectorAll('header').length).toBe(1);
    expect(el.querySelector('header mat-toolbar')).toBeTruthy();
  });

  it('shows the account menu only with a session', async () => {
    expect(el.querySelector('app-account-menu button')).toBeNull();
    user.set({ id: 1, firstName: 'Ana', lastName: 'Pérez', email: 'a@x.com', role: 'USER' });
    await fixture.whenStable();
    expect(el.querySelector('app-account-menu button')?.textContent).toContain('Ana');
  });

  it('does not render the brand as a heading', () => {
    expect(el.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
  });
});
