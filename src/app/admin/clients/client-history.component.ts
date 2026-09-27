import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { formatCurrency } from '../../core/utils/currency.util';
import { AppointmentsService, ClientAppointment } from '../appointments/appointments.service';

@Component({
  selector: 'app-client-history',
  standalone: true,
  template: `
    <h1>Historial</h1>

    @if (loading()) {
      <p class="hint">Cargando…</p>
    } @else if (appointments().length === 0) {
      <p class="empty-state">Aún no tiene sesiones completadas.</p>
    } @else {
      <p class="hint">{{ appointments().length }} sesiones · {{ formatCurrency(total()) }} en total</p>
      <ul class="list">
        @for (appt of appointments(); track appt.id) {
          <li class="list-item">
            <span class="hint" style="min-width:60px;">#{{ appt.session_number ?? '—' }}</span>
            <span style="flex:1;">{{ formatDate(appt.scheduled_at) }}</span>
            @if (appt.is_benefit_session) {
              <span class="badge badge-gold">Sesión de beneficio</span>
            }
            <span style="font-weight:700;">{{ formatCurrency(appt.total_amount ?? 0) }}</span>
          </li>
        }
      </ul>
    }
  `,
})
export class ClientHistoryComponent implements OnInit {
  loading = signal(true);
  appointments = signal<ClientAppointment[]>([]);
  formatCurrency = formatCurrency;

  constructor(private readonly route: ActivatedRoute, private readonly appointmentsService: AppointmentsService) {}

  async ngOnInit() {
    const clientId = this.route.snapshot.paramMap.get('id');
    if (clientId) {
      this.appointments.set(await this.appointmentsService.getClientAppointments(clientId));
    }
    this.loading.set(false);
  }

  total(): number {
    return this.appointments().reduce((sum, a) => sum + (a.total_amount ?? 0), 0);
  }

  formatDate(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  }
}
