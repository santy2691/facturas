import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  let fixture: ComponentFixture<TopBar>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TopBar] }).compileComponents();
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

  it('does not render the brand as a heading', () => {
    expect(el.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
  });
});
