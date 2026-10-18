import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth-guard';
import { AuthLayout } from './core/layout/auth-layout/auth-layout';
import { MainLayout } from './core/layout/main-layout/main-layout';

export const routes: Routes = [
  // Main layout first: otherwise '/' would match AuthLayout (empty path, no child needed).
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'inicio',
        title: 'Inicio · Facturas',
        loadComponent: () => import('./features/home/home/home').then((m) => m.Home),
      },
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
    ],
  },
  {
    path: '',
    component: AuthLayout,
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        title: 'Iniciar sesión · Facturas',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'registro',
        title: 'Crear cuenta · Facturas',
        loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
      },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
