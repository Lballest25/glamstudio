import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { formatCurrency } from '../../core/utils/currency.util';
import { avatarColors, formatDuration, initials, plural, toLocalISODate } from '../../core/utils/format.util';
import { CATEGORY_ORDER, categoryMeta } from '../../core/utils/labels';
import { IconComponent } from '../../shared/components/icon.component';
import { CatalogService, ServiceRow } from '../catalog/catalog.service';
import { ClientRow, ClientsService } from '../clients/clients.service';
import { AppointmentsService } from './appointments.service';

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="page page-narrow fade-in">
      <a class="back-link" routerLink="/admin/citas">
        <app-icon name="arrow-left" [size]="18" />
        Agenda
      </a>

      <header>
        <h1>Nueva cita</h1>
        <p class="page-subtitle">Agenda una cita para una clienta registrada.</p>
      </header>

      <section class="card card-pad stack">
        <div class="step-title"><span class="step-num">1</span><h2>Clienta</h2></div>
        @if (selectedClient(); as client) {
          <div class="picked">
            <span class="avatar" [style.background]="avatar(client.full_name).bg" [style.color]="avatar(client.full_name).fg">{{
              initials(client.full_name)
            }}</span>
            <span class="grow">
              <span class="list-title truncate" style="display: block">{{ client.full_name }}</span>
              <span class="list-sub" style="display: block">{{ client.phone || 'Sin teléfono' }}</span>
            </span>
            <button type="button" class="btn btn-ghost btn-sm" (click)="clearClient()">Cambiar</button>
          </div>
        } @else {
          <div class="input-icon">
            <app-icon name="search" [size]="18" />
            <input
              class="input"
              type="search"
              placeholder="Busca por nombre…"
              aria-label="Buscar clienta"
              [(ngModel)]="clientQuery"
              (ngModelChange)="onClientQueryChange()"
            />
          </div>
          @if (clientResults().length > 0) {
            <ul class="list results">
              @for (client of clientResults(); track client.id) {
                <li>
                  <button type="button" class="list-row" (click)="selectClient(client)">
                    <span
                      class="avatar avatar-sm"
                      [style.background]="avatar(client.full_name).bg"
                      [style.color]="avatar(client.full_name).fg"
                      >{{ initials(client.full_name) }}</span
                    >
                    <span class="grow">
                      <span class="list-title truncate" style="display: block">{{ client.full_name }}</span>
                      <span class="list-sub" style="display: block">{{ client.phone || '' }}</span>
                    </span>
                  </button>
                </li>
              }
            </ul>
          } @else if (clientQuery.trim().length >= 2 && !searching()) {
            <p class="subtle small">Sin resultados para "{{ clientQuery }}".</p>
          }
          <a class="link-sm" routerLink="/admin/clientas/nueva">
            <app-icon name="user-plus" [size]="16" />
            Registrar una clienta nueva
          </a>
        }
      </section>

      <section class="card card-pad stack">
        <div class="step-title"><span class="step-num">2</span><h2>Fecha y hora</h2></div>
        <div class="form-grid">
          <label class="field">
            <span class="field-label">Fecha</span>
            <input class="input" type="date" [(ngModel)]="date" />
          </label>
          <label class="field">
            <span class="field-label">Hora</span>
            <input class="input" type="time" step="900" [(ngModel)]="time" />
          </label>
        </div>
      </section>

      <section class="card card-pad stack">
        <div class="step-title"><span class="step-num">3</span><h2>Servicios</h2></div>
        @if (loadingServices()) {
          <div class="service-grid">
            @for (i of [1, 2, 3, 4]; track i) {
              <span class="skeleton" style="height: 64px; border-radius: 14px"></span>
            }
          </div>
        } @else {
          @for (group of groups(); track group.category) {
            <p class="section-title">{{ meta(group.category).label }}</p>
            <div class="service-grid">
              @for (service of group.items; track service.id) {
                <button
                  type="button"
                  class="service-tile"
                  [class.is-selected]="isSelected(service.id)"
                  [attr.aria-pressed]="isSelected(service.id)"
                  (click)="toggleService(service.id)"
                >
                  <span class="grow">
                    <span class="tile-name">{{ service.name }}</span>
                    <span class="tile-meta">{{ formatDuration(service.duration_min) }} · {{ formatCurrency(service.base_price) }}</span>
                  </span>
                  <span class="check"><app-icon name="check" [size]="13" [stroke]="3" /></span>
                </button>
              }
            </div>
          }
        }
      </section>

      <section class="card card-pad">
        <label class="field">
          <span class="field-label">Notas <span class="optional">(opcional)</span></span>
          <textarea class="input" rows="3" [(ngModel)]="notes" placeholder="Algo que debas recordar para esta cita"></textarea>
        </label>
      </section>

      @if (errorMessage()) {
        <div class="alert alert-danger">
          <app-icon name="alert-circle" [size]="18" />
          <span>{{ errorMessage() }}</span>
        </div>
      }

      <div class="sticky-actions">
        <div class="summary-bar">
          <div class="grow">
            <div class="strong num total">{{ formatCurrency(subtotal()) }}</div>
            <div class="subtle small truncate">{{ summaryText() }}</div>
          </div>
          <button type="button" class="btn btn-primary btn-lg" [disabled]="saving() || !canSave()" (click)="save()">
            @if (saving()) {
              <span class="spinner"></span>
            }
            Agendar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .step-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .step-num {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--c-primary-soft);
        color: var(--c-primary);
        font-size: 13px;
        font-weight: 800;
      }
      .picked {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: var(--r-md);
        background: var(--c-primary-soft);
      }
      .results {
        border: 1px solid var(--c-border);
        border-radius: var(--r-md);
        overflow: hidden;
      }
      .results .list-row {
        padding: 10px 14px;
      }
      .service-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 8px;
      }
      .service-tile {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        border: 1.5px solid var(--c-border);
        border-radius: var(--r-md);
        background: var(--c-surface);
        text-align: left;
        cursor: pointer;
        transition:
          border-color 0.15s,
          background 0.15s;
      }
      .service-tile:hover {
        border-color: var(--c-border-strong);
      }
      .service-tile.is-selected {
        border-color: var(--c-primary);
        background: var(--c-primary-soft);
      }
      .tile-name {
        display: block;
        font-weight: 700;
        font-size: 14px;
        line-height: 1.3;
      }
      .tile-meta {
        display: block;
        font-size: 12.5px;
        color: var(--c-text-2);
        margin-top: 2px;
      }
      .check {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid var(--c-border-strong);
        display: grid;
        place-items: center;
        color: transparent;
        flex-shrink: 0;
      }
      .is-selected .check {
        background: var(--c-primary);
        border-color: var(--c-primary);
        color: #fff;
      }
      .total {
        font-size: 18px;
      }
    `,
  ],
})
export class AppointmentFormComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly clientsService = inject(ClientsService);
  private readonly catalog = inject(CatalogService);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  selectedClient = signal<ClientRow | null>(null);
  clientQuery = '';
  clientResults = signal<ClientRow[]>([]);
  searching = signal(false);

  loadingServices = signal(true);
  services = signal<ServiceRow[]>([]);
  selectedIds = signal<Set<string>>(new Set());

  date = toLocalISODate(new Date());
  time = '10:00';
  notes = '';

  saving = signal(false);
  errorMessage = signal<string | null>(null);

  groups = computed(() =>
    CATEGORY_ORDER.map((category) => ({ category, items: this.services().filter((s) => s.category === category) })).filter(
      (g) => g.items.length > 0
    )
  );
  selectedServices = computed(() => this.services().filter((s) => this.selectedIds().has(s.id)));
  subtotal = computed(() => this.selectedServices().reduce((sum, s) => sum + s.base_price, 0));
  totalDuration = computed(() => this.selectedServices().reduce((sum, s) => sum + s.duration_min, 0));

  meta = categoryMeta;
  avatar = avatarColors;
  initials = initials;
  formatCurrency = formatCurrency;
  formatDuration = formatDuration;

  private ownerId: string | null = null;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit() {
    this.ownerId = this.auth.currentUser()?.id ?? null;
    if (!this.ownerId) return;

    const params = this.route.snapshot.queryParamMap;
    const presetDate = params.get('date');
    if (presetDate && /^\d{4}-\d{2}-\d{2}$/.test(presetDate)) this.date = presetDate;

    const clientId = params.get('clientId');
    const [services, client] = await Promise.all([
      this.catalog.getAllServices(this.ownerId),
      clientId ? this.clientsService.getClientById(clientId) : Promise.resolve(null),
    ]);
    this.services.set(services.filter((s) => s.is_active));
    this.selectedClient.set(client);
    this.loadingServices.set(false);
  }

  onClientQueryChange() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(async () => {
      if (!this.ownerId || this.clientQuery.trim().length < 2) {
        this.clientResults.set([]);
        return;
      }
      this.searching.set(true);
      const results = await this.clientsService.listClients(this.ownerId, this.clientQuery);
      this.clientResults.set(results.slice(0, 6));
      this.searching.set(false);
    }, 250);
  }

  selectClient(client: ClientRow) {
    this.selectedClient.set(client);
    this.clientResults.set([]);
    this.clientQuery = '';
  }

  clearClient() {
    this.selectedClient.set(null);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleService(id: string) {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  summaryText(): string {
    const count = this.selectedIds().size;
    if (!this.selectedClient()) return 'Elige una clienta';
    if (count === 0) return 'Elige al menos un servicio';
    return `${plural(count, 'servicio')} · ${formatDuration(this.totalDuration())}`;
  }

  canSave(): boolean {
    return !!this.selectedClient() && this.selectedIds().size > 0 && !!this.date && !!this.time;
  }

  async save() {
    const client = this.selectedClient();
    if (!client || !this.canSave()) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      const id = await this.appointmentsService.createAppointment(
        client.id,
        new Date(`${this.date}T${this.time}:00`),
        [...this.selectedIds()],
        this.notes.trim() || null
      );
      this.toast.success('Cita agendada');
      await this.router.navigate(['/admin/citas', id]);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo agendar la cita.');
    } finally {
      this.saving.set(false);
    }
  }
}
