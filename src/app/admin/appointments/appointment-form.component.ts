import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { formatCurrency } from '../../core/utils/currency.util';
import { ClientRow, ClientsService } from '../clients/clients.service';
import { CatalogService, ServiceRow } from '../catalog/catalog.service';
import { AppointmentsService } from './appointments.service';

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1>Nueva cita</h1>

    <div class="card" style="max-width: 560px;">
      <label class="field">Clienta</label>
      @if (selectedClient()) {
        <div class="list-item" style="margin-bottom:14px;">
          <span style="flex:1; font-weight:600;">{{ selectedClient()!.full_name }}</span>
          <button class="btn btn-sm" (click)="clearClient()">Cambiar</button>
        </div>
      } @else {
        <input
          type="search"
          class="field"
          placeholder="Buscar clienta por nombre…"
          [(ngModel)]="clientQuery"
          (ngModelChange)="onClientQueryChange()"
        />
        @if (clientResults().length > 0) {
          <ul class="list" style="margin-bottom:14px;">
            @for (client of clientResults(); track client.id) {
              <li class="list-item" (click)="selectClient(client)">{{ client.full_name }}</li>
            }
          </ul>
        }
      }

      <div style="display:flex; gap:12px;">
        <label class="field" style="flex:1;">
          Fecha
          <input type="date" name="date" [(ngModel)]="date" required />
        </label>
        <label class="field" style="flex:1;">
          Hora
          <input type="time" name="time" [(ngModel)]="time" required />
        </label>
      </div>

      <label class="field">Servicios</label>
      @for (category of categories(); track category) {
        <p class="hint" style="margin: 4px 0;">{{ category }}</p>
        @for (service of servicesByCategory(category); track service.id) {
          <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <input
              type="checkbox"
              [checked]="isSelected(service.id)"
              (change)="toggleService(service.id)"
            />
            {{ service.name }} — {{ formatCurrency(service.base_price) }}
          </label>
        }
      }

      <p style="font-weight:800; margin: 16px 0;">Subtotal: {{ formatCurrency(subtotal()) }}</p>

      <label class="field">
        Notas
        <textarea name="notes" rows="2" [(ngModel)]="notes"></textarea>
      </label>

      @if (errorMessage()) {
        <p class="error-text">{{ errorMessage() }}</p>
      }

      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary" [disabled]="saving() || !canSave()" (click)="save()">
          {{ saving() ? 'Guardando…' : 'Agendar cita' }}
        </button>
        <button class="btn" (click)="cancel()">Cancelar</button>
      </div>
    </div>
  `,
})
export class AppointmentFormComponent implements OnInit {
  selectedClient = signal<ClientRow | null>(null);
  clientQuery = '';
  clientResults = signal<ClientRow[]>([]);

  allServices = signal<ServiceRow[]>([]);
  selectedServiceIds = signal<Set<string>>(new Set());

  date = '';
  time = '10:00';
  notes = '';

  saving = signal(false);
  errorMessage = signal<string | null>(null);

  formatCurrency = formatCurrency;

  private ownerId: string | null = null;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly clientsService: ClientsService,
    private readonly catalog: CatalogService,
    private readonly appointmentsService: AppointmentsService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    this.ownerId = this.auth.currentUser()?.id ?? null;
    if (!this.ownerId) return;

    this.date = new Date().toISOString().slice(0, 10);
    this.allServices.set((await this.catalog.getAllServices(this.ownerId)).filter((s) => s.is_active));

    const clientId = this.route.snapshot.queryParamMap.get('clientId');
    if (clientId) {
      this.selectedClient.set(await this.clientsService.getClientById(clientId));
    }
  }

  categories(): string[] {
    return [...new Set(this.allServices().map((s) => s.category))];
  }

  servicesByCategory(category: string): ServiceRow[] {
    return this.allServices().filter((s) => s.category === category);
  }

  onClientQueryChange() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(async () => {
      if (!this.ownerId || this.clientQuery.trim().length < 2) {
        this.clientResults.set([]);
        return;
      }
      const results = await this.clientsService.listClients(this.ownerId, this.clientQuery);
      this.clientResults.set(results.slice(0, 5));
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
    return this.selectedServiceIds().has(id);
  }

  toggleService(id: string) {
    const next = new Set(this.selectedServiceIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedServiceIds.set(next);
  }

  subtotal(): number {
    const ids = this.selectedServiceIds();
    return this.allServices()
      .filter((s) => ids.has(s.id))
      .reduce((sum, s) => sum + s.base_price, 0);
  }

  canSave(): boolean {
    return !!this.selectedClient() && this.selectedServiceIds().size > 0 && !!this.date && !!this.time;
  }

  async save() {
    const client = this.selectedClient();
    if (!client || !this.canSave()) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      const scheduledAt = new Date(`${this.date}T${this.time}:00`);
      const id = await this.appointmentsService.createAppointment(
        client.id,
        scheduledAt,
        [...this.selectedServiceIds()],
        this.notes || null
      );
      await this.router.navigate(['/admin/citas', id]);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo agendar la cita.');
    } finally {
      this.saving.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/admin/citas']);
  }
}
