import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { formatCurrency } from '../../core/utils/currency.util';
import { formatDateMedium, plural } from '../../core/utils/format.util';
import { IconComponent } from '../../shared/components/icon.component';
import { AppointmentsService, ClientAppointment } from '../appointments/appointments.service';
import { ClientsService } from './clients.service';

@Component({
  selector: 'app-client-history',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page page-narrow fade-in">
      <a class="back-link" [routerLink]="['/admin/clientas', clientId]">
        <app-icon name="arrow-left" [size]="18" />
        Perfil
      </a>

      <header>
        <h1>Historial</h1>
        <p class="page-subtitle">{{ clientName() }}</p>
      </header>

      <section class="grid grid-stats">
        <div class="card stat">
          <span class="stat-label">Sesiones completadas</span>
          <span class="stat-value">{{ appointments().length }}</span>
        </div>
        <div class="card stat">
          <span class="stat-label">Total invertido</span>
          <span class="stat-value">{{ formatCurrency(total()) }}</span>
        </div>
      </section>

      <section class="card">
        @if (loading()) {
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="skeleton-row"><span class="skeleton grow" style="height: 16px"></span></div>
          }
        } @else if (appointments().length === 0) {
          <div class="empty">
            <span class="empty-icon"><app-icon name="history" [size]="26" /></span>
            <span class="empty-title">Sin sesiones todavía</span>
            <span>Aquí verás cada cita completada y lo que se cobró.</span>
          </div>
        } @else {
          <ul class="list">
            @for (appt of appointments(); track appt.id) {
              <li>
                <a class="list-row" [routerLink]="['/admin/citas', appt.id]">
                  <span class="session">#{{ appt.session_number ?? '—' }}</span>
                  <span class="grow">
                    <span class="list-title" style="display: block">{{ formatDateMedium(appt.scheduled_at) }}</span>
                    <span class="list-sub truncate" style="display: block">{{ appt.service_names.join(' · ') }}</span>
                  </span>
                  @if (appt.is_benefit_session) {
                    <span class="badge badge-gold"><app-icon name="gift" [size]="13" /> Beneficio</span>
                  }
                  <span class="strong num">{{ formatCurrency(appt.total_amount ?? 0) }}</span>
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
      .session {
        width: 40px;
        font-weight: 800;
        color: var(--c-text-3);
        font-size: 13px;
      }
    `,
  ],
})
export class ClientHistoryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly clientsService = inject(ClientsService);

  clientId = this.route.snapshot.paramMap.get('id');
  loading = signal(true);
  appointments = signal<ClientAppointment[]>([]);
  clientName = signal('');
  total = computed(() => this.appointments().reduce((sum, a) => sum + (a.total_amount ?? 0), 0));

  formatCurrency = formatCurrency;
  formatDateMedium = formatDateMedium;
  plural = plural;

  async ngOnInit() {
    if (!this.clientId) return;
    const [appointments, client] = await Promise.all([
      this.appointmentsService.getClientAppointments(this.clientId),
      this.clientsService.getClientById(this.clientId),
    ]);
    this.appointments.set(appointments);
    this.clientName.set(client?.full_name ?? '');
    this.loading.set(false);
  }
}
