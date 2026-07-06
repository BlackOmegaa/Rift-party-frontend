import { Routes } from '@angular/router';
import { adminAuthGuard } from './core/guards/admin-auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent) },
  { path: 'room/:code', loadComponent: () => import('./pages/room/room.component').then((m) => m.RoomComponent) },
  { path: 'rp-console', loadComponent: () => import('./pages/admin-login/admin-login.component').then((m) => m.AdminLoginComponent) },
  {
    path: 'rp-console/dashboard',
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
    canActivate: [adminAuthGuard],
  },
  { path: '**', redirectTo: '' },
];
