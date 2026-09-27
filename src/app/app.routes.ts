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
        children: [
          {
            path: '',
            loadComponent: () => import('./admin/clients/clients-list.component').then((m) => m.ClientsListComponent),
          },
          {
            path: 'nueva',
            loadComponent: () => import('./admin/clients/client-form.component').then((m) => m.ClientFormComponent),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./admin/clients/client-detail.component').then((m) => m.ClientDetailComponent),
          },
          {
            path: ':id/editar',
            loadComponent: () => import('./admin/clients/client-form.component').then((m) => m.ClientFormComponent),
          },
          {
            path: ':id/historial',
            loadComponent: () =>
              import('./admin/clients/client-history.component').then((m) => m.ClientHistoryComponent),
          },
          {
            path: ':id/fidelizacion',
            loadComponent: () =>
              import('./admin/loyalty/client-loyalty.component').then((m) => m.ClientLoyaltyComponent),
          },
        ],
      },
      {
        path: 'citas',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./admin/appointments/appointments-calendar.component').then(
                (m) => m.AppointmentsCalendarComponent
              ),
          },
          {
            path: 'nueva',
            loadComponent: () =>
              import('./admin/appointments/appointment-form.component').then((m) => m.AppointmentFormComponent),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./admin/appointments/appointment-detail.component').then((m) => m.AppointmentDetailComponent),
          },
          {
            path: ':id/completar',
            loadComponent: () =>
              import('./admin/appointments/complete-appointment.component').then(
                (m) => m.CompleteAppointmentComponent
              ),
          },
        ],
      },
      {
        path: 'catalogo',
        loadComponent: () => import('./admin/catalog/catalog.component').then((m) => m.CatalogComponent),
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
