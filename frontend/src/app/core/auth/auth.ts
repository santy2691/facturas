import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { catchError, finalize, firstValueFrom, map, Observable, shareReplay, tap, throwError } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from './auth.models';

const API = '/api/auth';

@Service()
export class Auth {
  private readonly http = inject(HttpClient);

  // The access token lives only in memory: never in localStorage/sessionStorage.
  private readonly accessToken = signal<string | null>(null);
  private readonly currentUser = signal<UserResponse | null>(null);
  private refreshInFlight$: Observable<string> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  register(request: RegisterRequest): Observable<UserResponse> {
    return this.http
      .post<AuthResponse>(`${API}/register`, request)
      .pipe(this.storeSession());
  }

  login(request: LoginRequest): Observable<UserResponse> {
    return this.http.post<AuthResponse>(`${API}/login`, request).pipe(this.storeSession());
  }

  /** Renews the session using the HttpOnly cookie. Concurrent calls share one request. */
  refresh(): Observable<string> {
    this.refreshInFlight$ ??= this.http.post<AuthResponse>(`${API}/refresh`, null).pipe(
      tap((response) => this.setSession(response)),
      map((response) => response.accessToken),
      catchError((error: unknown) => {
        this.clear();
        return throwError(() => error);
      }),
      finalize(() => {
        this.refreshInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshInFlight$;
  }

  /** Tries to recover the session on startup. Never rejects. */
  async restoreSession(): Promise<void> {
    try {
      await firstValueFrom(this.refresh());
    } catch {
      this.clear();
    }
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${API}/logout`, null).pipe(
      map(() => undefined),
      finalize(() => this.clear()),
    );
  }

  token(): string | null {
    return this.accessToken();
  }

  clear(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
  }

  private storeSession() {
    return (source: Observable<AuthResponse>): Observable<UserResponse> =>
      source.pipe(
        tap((response) => this.setSession(response)),
        map((response) => response.user),
      );
  }

  private setSession(response: AuthResponse): void {
    this.accessToken.set(response.accessToken);
    this.currentUser.set(response.user);
  }
}
