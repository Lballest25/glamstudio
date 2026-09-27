import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'agendar', pathMatch: 'full' },
  {
    path: 'agendar',
    loadComponent: () => import('./booking/booking-shell.component').then((m) => m.BookingShellComponent),
  },
  {
    path: 'admin/login',
    canActivate: [guestGuard],
    loadComponent: () => import('./admin/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./admin/layout/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'clientas',
        loadComponent: () =>
          import('./admin/clients/clients-list.component').then((m) => m.ClientsListComponent),
      },
      {
        path: 'citas',
        loadComponent: () =>
          import('./admin/appointments/appointments-calendar.component').then((m) => m.AppointmentsCalendarComponent),
      },
      {
        path: 'reportes',
        loadComponent: () => import('./admin/reports/reports.component').then((m) => m.ReportsComponent),
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./admin/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'agendar' },
];
