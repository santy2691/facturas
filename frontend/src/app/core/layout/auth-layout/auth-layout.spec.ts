import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthLayout } from './auth-layout';

describe('AuthLayout', () => {
  let fixture: ComponentFixture<AuthLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthLayout],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(AuthLayout);
    await fixture.whenStable();
  });

  it('renders the brand', () => {
    expect(fixture.nativeElement.textContent).toContain('Facturas');
  });

  it('contains the theme toggle', () => {
    expect(fixture.nativeElement.querySelector('app-theme-toggle')).toBeTruthy();
  });

  it('contains a router outlet', () => {
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

  it('uses the shared top bar', () => {
    expect(fixture.nativeElement.querySelector('app-top-bar')).toBeTruthy();
  });

  it('places the router outlet inside main', () => {
    expect(fixture.nativeElement.querySelector('main router-outlet')).toBeTruthy();
  });
});
