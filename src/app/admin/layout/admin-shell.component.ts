import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <img src="logo.png" alt="" />
          <span>GlamStudio</span>
        </div>
        <nav>
          <a routerLink="dashboard" routerLinkActive="active">Inicio</a>
          <a routerLink="clientas" routerLinkActive="active">Clientas</a>
          <a routerLink="citas" routerLinkActive="active">Citas</a>
          <a routerLink="reportes" routerLinkActive="active">Reportes</a>
          <a routerLink="configuracion" routerLinkActive="active">Configuración</a>
        </nav>
        <button class="signout" (click)="signOut()">Cerrar sesión</button>
      </aside>
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .shell {
        display: flex;
        min-height: 100dvh;
      }
      .sidebar {
        width: 220px;
        flex-shrink: 0;
        background: var(--color-surface);
        border-right: 1px solid var(--color-divider);
        display: flex;
        flex-direction: column;
        padding: 20px 16px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 24px;
        font-weight: 800;
        color: var(--color-text-primary);
      }
      .brand img {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        object-fit: cover;
      }
      nav {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
      }
      nav a {
        padding: 10px 12px;
        border-radius: var(--radius-md);
        color: var(--color-text-secondary);
        text-decoration: none;
        font-weight: 600;
        font-size: 14px;
      }
      nav a:hover {
        background: var(--color-surface-variant);
      }
      nav a.active {
        background: var(--color-primary);
        color: white;
      }
      .signout {
        border: none;
        background: transparent;
        color: var(--color-error);
        font-weight: 700;
        padding: 10px 12px;
        text-align: left;
        cursor: pointer;
        border-radius: var(--radius-md);
      }
      .signout:hover {
        background: var(--color-surface-variant);
      }
      .content {
        flex: 1;
        padding: 24px;
        overflow-y: auto;
      }
      @media (max-width: 720px) {
        .shell {
          flex-direction: column;
        }
        .sidebar {
          width: 100%;
          flex-direction: row;
          align-items: center;
          overflow-x: auto;
        }
        nav {
          flex-direction: row;
        }
        .brand span {
          display: none;
        }
      }
    `,
  ],
})
export class AdminShellComponent {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  async signOut() {
    await this.auth.signOut();
    await this.router.navigateByUrl('/admin/login');
  }
}
