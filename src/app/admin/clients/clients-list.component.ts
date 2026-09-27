import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { avatarColors, initials, plural } from '../../core/utils/format.util';
import { IconComponent } from '../../shared/components/icon.component';
import { ClientRow, ClientsService, LoyaltyProgressRow } from './clients.service';

interface ClientListItem {
  client: ClientRow;
  initials: string;
  avatar: { bg: string; fg: string };
  badge: { label: string; cls: string; icon: string | null };
}

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="page fade-in">
      <header class="page-header">
        <div>
          <h1>Clientas</h1>
          <p class="page-subtitle">
            @if (loading()) {
              Cargando…
            } @else if (query.trim()) {
              {{ plural(items().length, 'resultado') }}
            } @else {
              {{ plural(items().length, 'clienta activa', 'clientas activas') }}
            }
          </p>
        </div>
        <a class="btn btn-primary" routerLink="/admin/clientas/nueva">
          <app-icon name="user-plus" [size]="18" />
          Nueva clienta
        </a>
      </header>

      <div class="input-icon search">
        <app-icon name="search" [size]="18" />
        <input
          class="input"
          type="search"
          placeholder="Buscar por nombre…"
          aria-label="Buscar clientas"
          [(ngModel)]="query"
          (ngModelChange)="onQueryChange()"
        />
      </div>

      <section class="card">
        @if (loading()) {
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <div class="skeleton-row">
              <span class="skeleton" style="width: 44px; height: 44px; border-radius: 50%"></span>
              <span class="grow stack" style="gap: 6px">
                <span class="skeleton" style="height: 14px; width: 45%"></span>
                <span class="skeleton" style="height: 12px; width: 30%"></span>
              </span>
            </div>
          }
        } @else if (items().length === 0) {
          <div class="empty">
            <span class="empty-icon"><app-icon name="users" [size]="26" /></span>
            @if (query.trim()) {
              <span class="empty-title">Sin resultados</span>
              <span>No encontramos clientas con "{{ query }}".</span>
            } @else {
              <span class="empty-title">Aún no tienes clientas</span>
              <span>Registra la primera o espera a que agenden en línea.</span>
              <a class="btn btn-soft btn-sm" routerLink="/admin/clientas/nueva">
                <app-icon name="user-plus" [size]="16" />
                Registrar clienta
              </a>
            }
          </div>
        } @else {
          <ul class="list">
            @for (item of items(); track item.client.id) {
              <li>
                <a class="list-row" [routerLink]="['/admin/clientas', item.client.id]">
                  <span class="avatar" [style.background]="item.avatar.bg" [style.color]="item.avatar.fg">{{
                    item.initials
                  }}</span>
                  <span class="grow">
                    <span class="list-title truncate" style="display: block">{{ item.client.full_name }}</span>
                    <span class="list-sub truncate" style="display: block">{{
                      item.client.phone || item.client.email || 'Sin datos de contacto'
                    }}</span>
                  </span>
                  <span [class]="'badge ' + item.badge.cls">
                    @if (item.badge.icon) {
                      <app-icon [name]="item.badge.icon" [size]="13" />
                    }
                    {{ item.badge.label }}
                  </span>
                  <app-icon name="chevron-right" [size]="18" class="chev" />
                </a>
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `,
  styles: [
    `
      .search {
        max-width: 460px;
      }
    `,
  ],
})
export class ClientsListComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly clientsService = inject(ClientsService);
  private readonly toast = inject(ToastService);

  loading = signal(true);
  query = '';
  private clients = signal<ClientRow[]>([]);
  private loyalty = signal<Map<string, LoyaltyProgressRow>>(new Map());

  items = computed<ClientListItem[]>(() =>
    this.clients().map((client) => ({
      client,
      initials: initials(client.full_name),
      avatar: avatarColors(client.full_name),
      badge: this.badgeFor(this.loyalty().get(client.id)),
    }))
  );

  plural = plural;

  private ownerId: string | null = null;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit() {
    this.ownerId = this.auth.currentUser()?.id ?? null;
    await this.reload();
  }

  onQueryChange() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.reload(), 250);
  }

  private async reload() {
    if (!this.ownerId) return;
    this.loading.set(true);
    try {
      const clients = await this.clientsService.listClients(this.ownerId, this.query);
      const loyalty = await this.clientsService.getLoyaltyProgressByClientIds(
        this.ownerId,
        clients.map((c) => c.id)
      );
      this.clients.set(clients);
      this.loyalty.set(loyalty);
    } catch {
      this.toast.error('No se pudieron cargar las clientas.');
    } finally {
      this.loading.set(false);
    }
  }

  private badgeFor(progress: LoyaltyProgressRow | undefined): ClientListItem['badge'] {
    if (!progress) return { label: 'Nueva', cls: '', icon: null };
    if (progress.benefit_pending) {
      return progress.pending_benefit_type === 'gift'
        ? { label: 'Obsequio', cls: 'badge-gold', icon: 'gift' }
        : { label: `${progress.pending_benefit_value}% listo`, cls: 'badge-gold', icon: 'gift' };
    }
    if (progress.alert_pending) return { label: 'A 1 sesión', cls: 'badge-warning', icon: 'bell' };
    return { label: plural(progress.total_sessions, 'sesión', 'sesiones'), cls: '', icon: null };
  }
}
