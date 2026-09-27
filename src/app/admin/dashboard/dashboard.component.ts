import { Component, OnInit, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { formatCurrency } from '../../core/utils/currency.util';
import { buildBirthdayUri } from '../../core/utils/whatsapp.util';
import {
  BirthdayClient,
  DashboardService,
  LoyaltyAlertRow,
  TodayAppointment,
} from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <h1>Hoy</h1>

    @if (loading()) {
      <p class="hint">Cargando…</p>
    } @else {
      <section class="summary-cards">
        <div class="card">
          <span class="label">Citas hoy</span>
          <span class="value">{{ todayAppointments().length }}</span>
        </div>
        <div class="card">
          <span class="label">Ingresos del mes</span>
          <span class="value">{{ formatCurrency(monthTotal()) }}</span>
        </div>
        <div class="card">
          <span class="label">Sesiones del mes</span>
          <span class="value">{{ monthCount() }}</span>
        </div>
      </section>

      <section class="block">
        <h2>Citas de hoy</h2>
        @if (todayAppointments().length === 0) {
          <p class="hint">No hay citas programadas para hoy.</p>
        } @else {
          <ul class="list">
            @for (appt of todayAppointments(); track appt.id) {
              <li>
                <span class="time">{{ formatTime(appt.scheduled_at) }}</span>
                <span class="name">{{ appt.client_name }}</span>
                <span class="status" [class]="'status-' + appt.status">{{ statusLabel(appt.status) }}</span>
              </li>
            }
          </ul>
        }
      </section>

      <section class="block">
        <h2>Alertas de fidelización</h2>
        @if (loyaltyAlerts().length === 0) {
          <p class="hint">Sin alertas pendientes.</p>
        } @else {
          <ul class="list">
            @for (alert of loyaltyAlerts(); track alert.client_id) {
              <li>
                <span class="name">{{ alert.client_name }}</span>
                <span class="hint">{{ alert.benefit_pending ? '¡Beneficio listo!' : alert.alert_message }}</span>
              </li>
            }
          </ul>
        }
      </section>

      <section class="block">
        <h2>Cumpleaños hoy 🎂</h2>
        @if (birthdays().length === 0) {
          <p class="hint">Ninguno hoy.</p>
        } @else {
          <ul class="list">
            @for (client of birthdays(); track client.id) {
              <li>
                <span class="name">{{ client.full_name }}</span>
                @if (client.phone) {
                  <a class="whatsapp" [href]="birthdayLink(client)" target="_blank" rel="noopener">Enviar felicitación</a>
                }
              </li>
            }
          </ul>
        }
      </section>
    }
  `,
  styles: [
    `
      h1 {
        margin: 0 0 20px;
      }
      h2 {
        font-size: 16px;
        margin: 0 0 12px;
        color: var(--color-text-secondary);
      }
      .hint {
        color: var(--color-text-hint);
        font-size: 14px;
      }
      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
        margin-bottom: 28px;
      }
      .card {
        background: var(--color-surface);
        border-radius: var(--radius-md);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .card .label {
        font-size: 12px;
        color: var(--color-text-hint);
      }
      .card .value {
        font-size: 22px;
        font-weight: 800;
        color: var(--color-primary-dark);
      }
      .block {
        margin-bottom: 28px;
      }
      .list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .list li {
        background: var(--color-surface);
        border-radius: var(--radius-md);
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .time {
        font-weight: 700;
        color: var(--color-primary-dark);
        min-width: 70px;
      }
      .name {
        font-weight: 600;
        flex: 1;
      }
      .status {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--color-surface-variant);
        color: var(--color-text-secondary);
      }
      .status-completed {
        background: var(--color-success);
        color: white;
      }
      .status-in_progress {
        background: var(--color-info);
        color: white;
      }
      .whatsapp {
        color: var(--color-whatsapp-dark);
        font-weight: 700;
        font-size: 13px;
        text-decoration: none;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  todayAppointments = signal<TodayAppointment[]>([]);
  loyaltyAlerts = signal<LoyaltyAlertRow[]>([]);
  birthdays = signal<BirthdayClient[]>([]);
  monthTotal = signal(0);
  monthCount = signal(0);

  formatCurrency = formatCurrency;

  constructor(private readonly auth: AuthService, private readonly dashboard: DashboardService) {}

  async ngOnInit() {
    const ownerId = this.auth.currentUser()?.id;
    if (!ownerId) return;

    const now = new Date();
    const [appointments, alerts, birthdays, summary] = await Promise.all([
      this.dashboard.getTodayAppointments(ownerId),
      this.dashboard.getLoyaltyAlerts(ownerId),
      this.dashboard.getBirthdaysToday(ownerId),
      this.dashboard.getMonthSummary(ownerId, now.getFullYear(), now.getMonth() + 1),
    ]);

    this.todayAppointments.set(appointments);
    this.loyaltyAlerts.set(alerts);
    this.birthdays.set(birthdays);
    this.monthTotal.set(summary.total);
    this.monthCount.set(summary.count);
    this.loading.set(false);
  }

  formatTime(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true }).format(
      new Date(iso)
    );
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      scheduled: 'Agendada',
      in_progress: 'En curso',
      completed: 'Completada',
      no_show: 'No asistió',
    };
    return labels[status] ?? status;
  }

  birthdayLink(client: BirthdayClient): string {
    return buildBirthdayUri(client.phone ?? '', client.full_name);
  }
}
