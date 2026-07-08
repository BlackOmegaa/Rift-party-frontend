import { Routes } from '@angular/router';
import { adminAuthGuard } from './core/guards/admin-auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Rift Party — Mini-jeux multijoueurs League of Legends entre amis',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'room/:code',
    title: 'Lobby — Rift Party',
    loadComponent: () => import('./pages/room/room.component').then((m) => m.RoomComponent),
  },
  {
    path: 'a-propos',
    title: 'À propos & mentions légales — Rift Party',
    loadComponent: () => import('./pages/a-propos/a-propos.component').then((m) => m.AProposComponent),
  },
  {
    path: 'rp-console',
    title: 'Console — Rift Party',
    loadComponent: () => import('./pages/admin-login/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'rp-console/dashboard',
    title: 'Dashboard — Rift Party',
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
    canActivate: [adminAuthGuard],
  },
  { path: '**', redirectTo: '' },
];
