import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { provideRouter, Router } from '@angular/router';
import { Auth } from '../../auth/auth';
import { UserResponse } from '../../auth/auth.models';
import { ModuleNav } from './module-nav';

@Component({ template: '' })
class Blank {}

describe('ModuleNav', () => {
  let fixture: ComponentFixture<ModuleNav>;
  let el: HTMLElement;
  let loader: HarnessLoader;
  const user = signal<UserResponse | null>(null);

  beforeEach(async () => {
    user.set({ id: 1, firstName: 'Ana', lastName: 'Pérez', email: 'a@x.com', role: 'USER' });
    await TestBed.configureTestingModule({
      imports: [ModuleNav],
      providers: [
        provideRouter([{ path: 'inicio', component: Blank }]),
        { provide: Auth, useValue: { user } },
      ],
    }).compileComponents();
    await TestBed.inject(Router).navigateByUrl('/inicio');
    fixture = TestBed.createComponent(ModuleNav);
    el = fixture.nativeElement;
    loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    await fixture.whenStable();
  });

  const tabs = () => Array.from(el.querySelectorAll<HTMLElement>('nav[aria-label="Módulos"] .tab'));

  it('shows the modules as tabs in order, with Inicio active', () => {
    expect(tabs().map((tab) => tab.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Inicio',
      'Grupos Próximamente',
    ]);
    const [inicio] = tabs();
    expect(inicio.tagName).toBe('A');
    expect(inicio.getAttribute('href')).toBe('/inicio');
    expect(inicio.classList).toContain('active');
    expect(inicio.getAttribute('aria-current')).toBe('page');
  });

  it('shows pending modules as non-links with "Próximamente"', () => {
    const [, grupos] = tabs();
    expect(grupos.tagName).toBe('SPAN');
    expect(grupos.getAttribute('aria-disabled')).toBe('true');
    expect(grupos.querySelector('.soon')?.textContent).toBe('Próximamente');
  });

  it('offers the same modules in the phone menu', async () => {
    const menu = await loader.getHarness(MatMenuHarness);
    await menu.open();
    const items = await menu.getItems();
    expect(await Promise.all(items.map((item) => item.getText()))).toEqual([
      'Inicio',
      'Grupos Próximamente',
    ]);
    expect(await items[0].isDisabled()).toBe(false);
    expect(await items[1].isDisabled()).toBe(true);
    const current = document.querySelector('.mat-mdc-menu-panel a[aria-current="page"]');
    expect(current?.textContent).toContain('Inicio');
  });

  it('labels the menu button', () => {
    expect(el.querySelector('.menu-toggle')?.getAttribute('aria-label')).toBe(
      'Abrir menú de módulos',
    );
  });

  it('renders nothing without a session', async () => {
    user.set(null);
    await fixture.whenStable();
    expect(el.querySelector('nav, button')).toBeNull();
  });
});
