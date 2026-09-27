import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClientRow, ClientsService, LoyaltyProgressRow } from './clients.service';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <h1>Clientas</h1>
      <a class="btn btn-primary" routerLink="nueva">+ Nueva clienta</a>
    </div>

    <input
      type="search"
      class="field"
      style="max-width: 320px; margin-bottom: 16px;"
      placeholder="Buscar por nombre…"
      [(ngModel)]="query"
      (ngModelChange)="onQueryChange()"
    />

    @if (loading()) {
      <p class="hint">Cargando…</p>
    } @else if (clients().length === 0) {
      <p class="empty-state">No se encontraron clientas.</p>
    } @else {
      <ul class="list">
        @for (client of clients(); track client.id) {
          <li class="list-item" [routerLink]="[client.id]">
            <span style="font-weight:700;">{{ initials(client.full_name) }}</span>
            <span style="flex:1;">
              <div style="font-weight:600;">{{ client.full_name }}</div>
              @if (client.phone) {
                <div class="hint">{{ client.phone }}</div>
              }
            </span>
            <span class="badge" [class]="badgeClass(client.id)">{{ badgeLabel(client.id) }}</span>
          </li>
        }
      </ul>
    }
  `,
})
export class ClientsListComponent implements OnInit {
  loading = signal(true);
  query = '';
  clients = signal<ClientRow[]>([]);
  loyalty = signal<Map<string, LoyaltyProgressRow>>(new Map());

  private ownerId: string | null = null;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly auth: AuthService, private readonly clientsService: ClientsService) {}

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
    const clients = await this.clientsService.listClients(this.ownerId, this.query);
    this.clients.set(clients);
    this.loyalty.set(await this.clientsService.getLoyaltyProgressByClientIds(this.ownerId, clients.map((c) => c.id)));
    this.loading.set(false);
  }

  initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  badgeLabel(clientId: string): string {
    const progress = this.loyalty().get(clientId);
    if (!progress) return '0 ses.';
    if (progress.benefit_pending) {
      return progress.pending_benefit_type === 'gift' ? '🎁 Obsequio' : `${progress.pending_benefit_value}% OFF`;
    }
    return `${progress.stage_sessions} ses.`;
  }

  badgeClass(clientId: string): string {
    const progress = this.loyalty().get(clientId);
    if (!progress) return '';
    if (progress.benefit_pending) return 'badge-gold';
    if (progress.alert_pending) return 'badge-warning';
    return '';
  }
}
