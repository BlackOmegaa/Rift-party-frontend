import { Routes } from '@angular/router';
import { adminAuthGuard } from './core/guards/admin-auth.guard';
import { playerAuthGuard } from './core/guards/player-auth.guard';

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
    path: 'login',
    title: 'Connexion — Rift Party',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'account',
    title: 'Mon compte — Rift Party',
    loadComponent: () => import('./pages/account/account.component').then((m) => m.AccountComponent),
    canActivate: [playerAuthGuard],
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
