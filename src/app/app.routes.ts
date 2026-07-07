import { Routes } from '@angular/router';
import { adminAuthGuard } from './core/guards/admin-auth.guard';
import { playerAuthGuard } from './core/guards/player-auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent) },
  { path: 'room/:code', loadComponent: () => import('./pages/room/room.component').then((m) => m.RoomComponent) },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent) },
  {
    path: 'account',
    loadComponent: () => import('./pages/account/account.component').then((m) => m.AccountComponent),
    canActivate: [playerAuthGuard],
  },
  { path: 'rp-console', loadComponent: () => import('./pages/admin-login/admin-login.component').then((m) => m.AdminLoginComponent) },
  {
    path: 'rp-console/dashboard',
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
    canActivate: [adminAuthGuard],
  },
  { path: '**', redirectTo: '' },
];
