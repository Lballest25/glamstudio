import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { bookingUrl, copyToClipboard } from '../../core/utils/booking-link';
import { IconComponent } from '../../shared/components/icon.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <aside class="sidebar">
      <a class="brand" routerLink="/admin/dashboard">
        <img src="logo.png" alt="" class="brand-logo" />
        <span class="brand-text">
          <span class="brand-name">GlamStudio</span>
          <span class="brand-sub">Panel del estudio</span>
        </span>
      </a>

      <nav class="side-nav" aria-label="Principal">
        @for (item of navItems; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="is-active">
            <app-icon [name]="item.icon" [size]="20" />
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>

      <div class="side-foot">
        <button type="button" class="share-card" (click)="copyBookingLink()">
          <span class="share-icon"><app-icon name="link" [size]="18" /></span>
          <span class="share-text">
            <strong>Link de reservas</strong>
            <span>Cópialo y compártelo</span>
          </span>
          <app-icon name="copy" [size]="16" class="share-copy" />
        </button>
        <button type="button" class="signout" (click)="signOut()">
          <app-icon name="log-out" [size]="18" />
          Cerrar sesión
        </button>
      </div>
    </aside>

    <header class="topbar">
      <a class="brand" routerLink="/admin/dashboard">
        <img src="logo.png" alt="" class="brand-logo" />
        <span class="brand-name">GlamStudio</span>
      </a>
      <a class="btn btn-primary btn-sm" routerLink="/admin/citas/nueva">
        <app-icon name="plus" [size]="16" />
        Nueva cita
      </a>
    </header>

    <main class="content">
      <router-outlet />
    </main>

    <nav class="tabbar" aria-label="Principal">
      @for (item of tabItems; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="is-active">
          <span class="tab-icon"><app-icon [name]="item.icon" [size]="22" /></span>
          <span class="tab-label">{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--c-text);
      }
      .brand-logo {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        object-fit: cover;
        box-shadow: 0 0 0 1px var(--c-border), var(--sh-sm);
      }
      .brand-text {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
      }
      .brand-name {
        font-family: var(--f-display);
        font-weight: 600;
        font-size: 20px;
        letter-spacing: -0.01em;
      }
      .brand-sub {
        font-size: 12px;
        color: var(--c-text-3);
        font-weight: 600;
      }

      .sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        z-index: 20;
        width: 264px;
        display: flex;
        flex-direction: column;
        gap: 28px;
        padding: 24px 16px 20px;
        background: var(--c-surface);
        border-right: 1px solid var(--c-border);
      }
      .sidebar .brand {
        padding: 0 8px;
      }
      .side-nav {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
      }
      .side-nav a {
        display: flex;
        align-items: center;
        gap: 12px;
        height: 46px;
        padding: 0 14px;
        border-radius: var(--r-md);
        color: var(--c-text-2);
        font-weight: 600;
        font-size: 14.5px;
        transition:
          background 0.15s,
          color 0.15s;
      }
      .side-nav a:hover {
        background: var(--c-surface-2);
        color: var(--c-text);
      }
      .side-nav a.is-active {
        background: var(--c-primary-soft);
        color: var(--c-primary);
        font-weight: 700;
      }
      .side-foot {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .share-card {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px;
        border-radius: var(--r-md);
        border: 1px dashed var(--c-border-strong);
        background: var(--c-surface-2);
        text-align: left;
        cursor: pointer;
        transition:
          border-color 0.15s,
          background 0.15s;
      }
      .share-card:hover {
        border-color: var(--c-primary);
        background: var(--c-primary-soft);
      }
      .share-icon {
        width: 36px;
        height: 36px;
        border-radius: var(--r-sm);
        display: grid;
        place-items: center;
        background: var(--c-surface);
        color: var(--c-primary);
        box-shadow: var(--sh-sm);
      }
      .share-text {
        display: flex;
        flex-direction: column;
        flex: 1;
        font-size: 13px;
        line-height: 1.3;
      }
      .share-text span {
        color: var(--c-text-3);
        font-size: 12px;
      }
      .share-copy {
        color: var(--c-text-3);
      }
      .signout {
        display: flex;
        align-items: center;
        gap: 12px;
        height: 44px;
        padding: 0 14px;
        border: 0;
        border-radius: var(--r-md);
        background: transparent;
        color: var(--c-text-2);
        font-weight: 600;
        cursor: pointer;
      }
      .signout:hover {
        background: var(--c-danger-soft);
        color: var(--c-danger);
      }

      .content {
        margin-left: 264px;
        padding: 36px 40px 64px;
      }
      .topbar,
      .tabbar {
        display: none;
      }

      @media (max-width: 959px) {
        .sidebar {
          display: none;
        }
        .content {
          margin-left: 0;
          padding: 20px 16px calc(var(--tabbar-h) + 32px + env(safe-area-inset-bottom));
        }
        .topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: calc(10px + env(safe-area-inset-top)) 16px 10px;
          background: rgba(250, 247, 252, 0.88);
          backdrop-filter: saturate(1.4) blur(14px);
          -webkit-backdrop-filter: saturate(1.4) blur(14px);
          border-bottom: 1px solid var(--c-border);
        }
        .topbar .brand-logo {
          width: 34px;
          height: 34px;
        }
        .topbar .brand-name {
          font-size: 19px;
        }
        .tabbar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 20;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          height: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
          padding-bottom: env(safe-area-inset-bottom);
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-top: 1px solid var(--c-border);
        }
        .tabbar a {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          color: var(--c-text-3);
          font-size: 11px;
          font-weight: 700;
        }
        .tab-icon {
          width: 54px;
          height: 30px;
          border-radius: var(--r-full);
          display: grid;
          place-items: center;
          transition: background 0.2s;
        }
        .tabbar a.is-active {
          color: var(--c-primary);
        }
        .tabbar a.is-active .tab-icon {
          background: var(--c-primary-soft);
        }
      }
    `,
  ],
})
export class AdminShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly navItems: NavItem[] = [
    { path: '/admin/dashboard', label: 'Inicio', icon: 'home' },
    { path: '/admin/citas', label: 'Agenda', icon: 'calendar' },
    { path: '/admin/clientas', label: 'Clientas', icon: 'users' },
    { path: '/admin/catalogo', label: 'Catálogo', icon: 'sparkles' },
    { path: '/admin/reportes', label: 'Reportes', icon: 'chart' },
    { path: '/admin/configuracion', label: 'Ajustes', icon: 'sliders' },
  ];

  // Catálogo is reachable from Ajustes on phones to keep the tab bar at 5.
  readonly tabItems = this.navItems.filter((item) => item.path !== '/admin/catalogo');

  async copyBookingLink() {
    const ok = await copyToClipboard(bookingUrl());
    if (ok) this.toast.success('Link de reservas copiado');
    else this.toast.show(bookingUrl(), 'info');
  }

  async signOut() {
    await this.auth.signOut();
    await this.router.navigateByUrl('/admin/login');
  }
}
