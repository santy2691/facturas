import { DOCUMENT } from '@angular/common';
import { inject, Service, signal } from '@angular/core';

const STORAGE_KEY = 'theme';
const DARK_CLASS = 'app-dark';

@Service()
export class Theme {
  private readonly document = inject(DOCUMENT);
  private readonly dark = signal(this.resolveInitialDark());

  readonly isDark = this.dark.asReadonly();

  constructor() {
    this.applyClass(this.dark());
  }

  toggle(): void {
    this.setDark(!this.dark());
  }

  setDark(value: boolean): void {
    this.dark.set(value);
    this.applyClass(value);
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light');
    } catch {
      // Storage unavailable: the preference just won't persist.
    }
  }

  private applyClass(value: boolean): void {
    this.document.documentElement.classList.toggle(DARK_CLASS, value);
  }

  // Same rule as the inline script in index.html: saved value > system > light.
  private resolveInitialDark(): boolean {
    const win = this.document.defaultView;
    try {
      const saved = win?.localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    } catch {
      // Ignore and fall back to the system preference.
    }
    try {
      return win?.matchMedia('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  }
}
