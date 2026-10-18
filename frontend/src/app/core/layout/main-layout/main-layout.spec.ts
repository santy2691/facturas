import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MainLayout } from './main-layout';

describe('MainLayout', () => {
  let fixture: ComponentFixture<MainLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayout],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(MainLayout);
    await fixture.whenStable();
  });

  it('renders the title', () => {
    expect(fixture.nativeElement.textContent).toContain('Facturas');
  });

  it('contains the theme toggle', () => {
    expect(fixture.nativeElement.querySelector('app-theme-toggle')).toBeTruthy();
  });

  it('contains a router outlet', () => {
    expect(fixture.nativeElement.querySelector('main router-outlet')).toBeTruthy();
  });

  it('uses the shared top bar', () => {
    expect(fixture.nativeElement.querySelector('app-top-bar')).toBeTruthy();
  });

  it('has a single main landmark', () => {
    expect(fixture.nativeElement.querySelectorAll('main').length).toBe(1);
  });
});
