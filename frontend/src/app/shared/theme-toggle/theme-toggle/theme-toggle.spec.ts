import { vi } from 'vitest';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatIconHarness } from '@angular/material/icon/testing';
import { Theme } from '../../../core/theme/theme';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  let fixture: ComponentFixture<ThemeToggle>;
  let button: MatButtonHarness;
  const isDark = signal(false);
  const toggle = vi.fn();

  beforeEach(async () => {
    isDark.set(false);
    toggle.mockClear();
    await TestBed.configureTestingModule({
      imports: [ThemeToggle],
      providers: [{ provide: Theme, useValue: { isDark, toggle } }],
    }).compileComponents();
    fixture = TestBed.createComponent(ThemeToggle);
    await fixture.whenStable();
    button = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatButtonHarness);
  });

  const iconName = async (): Promise<string | null> => {
    const icon = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatIconHarness);
    return icon.getName();
  };

  it('renders an icon button', async () => {
    expect(await button.getVariant()).toBe('icon');
  });

  it('calls toggle on click', async () => {
    await button.click();
    expect(toggle).toHaveBeenCalled();
  });

  it('shows moon icon and dark-mode label in light mode', async () => {
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-label')).toBe(
      'Activar modo oscuro',
    );
    expect(await iconName()).toBe('dark_mode');
  });

  it('shows sun icon and light-mode label in dark mode', async () => {
    isDark.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-label')).toBe(
      'Activar modo claro',
    );
    expect(await iconName()).toBe('light_mode');
  });
});
