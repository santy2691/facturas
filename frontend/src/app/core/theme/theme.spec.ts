import { vi, type MockInstance } from 'vitest';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Theme } from './theme';

describe('Theme', () => {
  let store: Record<string, string>;
  let setItem: MockInstance | undefined;
  let html: HTMLElement;

  function mockEnv(options: { saved?: string; systemDark?: boolean; storageThrows?: boolean }): void {
    store = options.saved !== undefined ? { theme: options.saved } : {};
    const storage = {
      getItem: (key: string) => {
        if (options.storageThrows) throw new Error('denied');
        return store[key] ?? null;
      },
      setItem: (key: string, value: string) => {
        if (options.storageThrows) throw new Error('denied');
        store[key] = value;
      },
    };
    setItem = vi.spyOn(storage, 'setItem');
    const fakeWindow = {
      localStorage: storage,
      matchMedia: () => ({ matches: options.systemDark ?? false }),
    };
    const fakeDocument = { documentElement: html, defaultView: fakeWindow };
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: fakeDocument }],
    });
  }

  beforeEach(() => {
    html = window.document.createElement('html');
  });

  it('is light with no saved value and light system', () => {
    mockEnv({});
    const service = TestBed.inject(Theme);
    expect(service.isDark()).toBe(false);
    expect(html.classList.contains('app-dark')).toBe(false);
  });

  it('is dark with no saved value and dark system', () => {
    mockEnv({ systemDark: true });
    const service = TestBed.inject(Theme);
    expect(service.isDark()).toBe(true);
    expect(html.classList.contains('app-dark')).toBe(true);
  });

  it('saved light wins over dark system', () => {
    mockEnv({ saved: 'light', systemDark: true });
    expect(TestBed.inject(Theme).isDark()).toBe(false);
  });

  it('saved dark wins over light system', () => {
    mockEnv({ saved: 'dark', systemDark: false });
    expect(TestBed.inject(Theme).isDark()).toBe(true);
  });

  it('ignores an invalid saved value', () => {
    mockEnv({ saved: 'azul', systemDark: true });
    expect(TestBed.inject(Theme).isDark()).toBe(true);
  });

  it('does not break when localStorage throws', () => {
    mockEnv({ storageThrows: true, systemDark: true });
    const service = TestBed.inject(Theme);
    expect(service.isDark()).toBe(true);
    expect(() => service.toggle()).not.toThrow();
  });

  it('does not write to localStorage on init', () => {
    mockEnv({ systemDark: true });
    TestBed.inject(Theme);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('toggle flips mode, class and saved value, and reverts', () => {
    mockEnv({});
    const service = TestBed.inject(Theme);
    service.toggle();
    expect(service.isDark()).toBe(true);
    expect(html.classList.contains('app-dark')).toBe(true);
    expect(store['theme']).toBe('dark');
    service.toggle();
    expect(service.isDark()).toBe(false);
    expect(html.classList.contains('app-dark')).toBe(false);
    expect(store['theme']).toBe('light');
  });

  it('setDark(true) is idempotent', () => {
    mockEnv({});
    const service = TestBed.inject(Theme);
    service.setDark(true);
    service.setDark(true);
    expect(service.isDark()).toBe(true);
    expect(html.classList.contains('app-dark')).toBe(true);
    expect(store['theme']).toBe('dark');
  });
});
