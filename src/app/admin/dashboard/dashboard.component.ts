import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OnlineBookingsService } from '../../core/services/online-bookings.service';
import { ToastService } from '../../core/services/toast.service';
import { bookingUrl, copyToClipboard } from '../../core/utils/booking-link';
import { formatCurrency } from '../../core/utils/currency.util';
import {
  avatarColors,
  formatDayLong,
  formatDuration,
  formatTime,
  greeting,
  initials,
  relativeDayLabel,
} from '../../core/utils/format.util';
import { statusMeta } from '../../core/utils/labels';
import { buildBirthdayUri } from '../../core/utils/whatsapp.util';
import { IconComponent } from '../../shared/components/icon.component';
import { RecontactService } from '../clients/recontact.service';
import { SettingsService } from '../settings/settings.service';
import { BirthdayClient, DashboardService, LoyaltyAlertRow, TodayAppointment } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page fade-in">
      <header class="page-header">
        <div>
          <p class="eyebrow">{{ todayLabel }}</p>
          <h1>{{ greetingText }}</h1>
        </div>
        <div class="row row-wrap">
          <button type="button" class="btn" (click)="copyBookingLink()">
            <app-icon name="link" [size]="18" />
            Link de reservas
          </button>
          <a class="btn btn-primary hide-mobile" routerLink="/admin/citas/nueva">
            <app-icon name="plus" [size]="18" />
            Nueva cita
          </a>
        </div>
      </header>

      @if (online.unseen().length > 0) {
        <section class="card new-bookings">
          <div class="card-head">
            <div class="row" style="gap: 10px">
              <span class="tile tone-success"><app-icon name="bell" [size]="20" /></span>
              <div>
                <h2>
                  {{ online.unseen().length === 1 ? '1 reserva nueva' : online.unseen().length + ' reservas nuevas' }}
                </h2>
                <p class="subtle small">Agendadas por tus clientas desde el link</p>
              </div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" (click)="online.markAllSeen()">Marcar vistas</button>
          </div>
          <ul class="list">
            @for (b of online.unseen(); track b.id) {
              <li>
                <a class="list-row" [routerLink]="['/admin/citas', b.id]">
                  <span class="time-block">
                    <span class="time">{{ formatTime(b.scheduled_at) }}</span>
                    <span class="dur">{{ dayLabel(b.scheduled_at) }}</span>
                  </span>
                  <span class="grow">
                    <span class="list-title truncate" style="display: block">{{ b.client_name }}</span>
                    <span class="list-sub truncate" style="display: block">{{
                      b.service_names.join(' · ') || 'Sin servicios'
                    }}</span>
                  </span>
                  <app-icon name="chevron-right" [size]="18" class="chev" />
                </a>
              </li>
            }
          </ul>
        </section>
      }

      <section class="grid grid-stats">
        <div class="card stat">
          <span class="stat-icon tone-primary"><app-icon name="calendar" [size]="20" /></span>
          <span class="stat-label">Citas de hoy</span>
          @if (loading()) {
            <span class="skeleton" style="height: 30px; width: 50%"></span>
          } @else {
            <span class="stat-value">{{ appointments().length }}</span>
          }
        </div>
        <div class="card stat">
          <span class="stat-icon tone-success"><app-icon name="wallet" [size]="20" /></span>
          <span class="stat-label">Ingresos del mes</span>
          @if (loading()) {
            <span class="skeleton" style="height: 30px; width: 70%"></span>
          } @else {
            <span class="stat-value">{{ formatCurrency(monthTotal()) }}</span>
          }
        </div>
        <div class="card stat">
          <span class="stat-icon tone-info"><app-icon name="calendar-check" [size]="20" /></span>
          <span class="stat-label">Sesiones del mes</span>
          @if (loading()) {
            <span class="skeleton" style="height: 30px; width: 40%"></span>
          } @else {
            <span class="stat-value">{{ monthCount() }}</span>
          }
        </div>
        <div class="card stat">
          <span class="stat-icon tone-gold"><app-icon name="gift" [size]="20" /></span>
          <span class="stat-label">Beneficios listos</span>
          @if (loading()) {
            <span class="skeleton" style="height: 30px; width: 40%"></span>
          } @else {
            <span class="stat-value">{{ pendingBenefits() }}</span>
          }
        </div>
      </section>

      <div class="dash-grid">
        <section class="card">
          <div class="card-head">
            <h2>Agenda de hoy</h2>
            <a class="link-sm" routerLink="/admin/citas">
              Ver agenda
              <app-icon name="chevron-right" [size]="16" />
            </a>
          </div>
          @if (loading()) {
            @for (i of [1, 2, 3]; track i) {
              <div class="skeleton-row">
                <span class="skeleton" style="width: 64px; height: 34px"></span>
                <span class="grow"><span class="skeleton" style="height: 14px; width: 60%"></span></span>
              </div>
            }
          } @else if (appointments().length === 0) {
            <div class="empty">
              <span class="empty-icon"><app-icon name="sun" [size]="26" /></span>
              <span class="empty-title">Día libre</span>
              <span>No hay citas agendadas para hoy.</span>
              <a class="btn btn-soft btn-sm" routerLink="/admin/citas/nueva">
                <app-icon name="plus" [size]="16" />
                Agendar una cita
              </a>
            </div>
          } @else {
            <ul class="list">
              @for (appt of appointments(); track appt.id) {
                <li>
                  <a class="list-row" [routerLink]="['/admin/citas', appt.id]">
                    <span class="time-block">
                      <span class="time">{{ formatTime(appt.scheduled_at) }}</span>
                      <span class="dur">{{ formatDuration(appt.duration_min) }}</span>
                    </span>
                    <span class="grow">
                      <span class="list-title truncate" style="display: block">{{ appt.client_name }}</span>
                      <span class="list-sub truncate" style="display: block">
                        {{ appt.service_names.join(' · ') || 'Sin servicios' }}
                      </span>
                    </span>
                    <span [class]="'badge ' + statusMeta(appt.status).badge">{{ statusMeta(appt.status).label }}</span>
                  </a>
                </li>
              }
            </ul>
          }
        </section>

        <div class="stack side">
          @if (returningCount() > 0) {
            <a class="card card-pad card-link" routerLink="/admin/clientas/volver">
              <div class="row">
                <span class="tile tone-primary"><app-icon name="repeat" [size]="20" /></span>
                <div class="grow">
                  <h3>Les toca volver</h3>
                  <p class="muted small">
                    {{ returningCount() === 1 ? '1 clienta lleva' : returningCount() + ' clientas llevan' }}
                    más de {{ returningLabel() }} sin venir
                  </p>
                </div>
                <app-icon name="chevron-right" [size]="18" class="chev" />
              </div>
            </a>
          }

          <section class="card">
            <div class="card-head">
              <h2>Fidelización</h2>
              @if (!loading() && alerts().length) {
                <span class="badge badge-gold">{{ alerts().length }}</span>
              }
            </div>
            @if (loading()) {
              <div class="skeleton-row"><span class="skeleton" style="height: 14px; width: 70%"></span></div>
            } @else if (alerts().length === 0) {
              <p class="side-empty">Sin alertas pendientes por ahora.</p>
            } @else {
              <ul class="list">
                @for (alert of alerts(); track alert.client_id) {
                  <li>
                    <a class="list-row" [routerLink]="['/admin/clientas', alert.client_id, 'fidelizacion']">
                      <span
                        class="avatar avatar-sm"
                        [style.background]="avatar(alert.client_name).bg"
                        [style.color]="avatar(alert.client_name).fg"
                        >{{ initials(alert.client_name) }}</span
                      >
                      <span class="grow">
                        <span class="list-title truncate" style="display: block">{{ alert.client_name }}</span>
                        <span class="list-sub" style="display: block">{{ alertText(alert) }}</span>
                      </span>
                      <app-icon name="chevron-right" [size]="18" class="chev" />
                    </a>
                  </li>
                }
              </ul>
            }
          </section>

          <section class="card">
            <div class="card-head">
              <h2>Cumpleaños de hoy</h2>
              <app-icon name="cake" [size]="20" class="subtle" />
            </div>
            @if (loading()) {
              <div class="skeleton-row"><span class="skeleton" style="height: 14px; width: 50%"></span></div>
            } @else if (birthdays().length === 0) {
              <p class="side-empty">Nadie cumple años hoy.</p>
            } @else {
              <ul class="list">
                @for (client of birthdays(); track client.id) {
                  <li class="list-row">
                    <span
                      class="avatar avatar-sm"
                      [style.background]="avatar(client.full_name).bg"
                      [style.color]="avatar(client.full_name).fg"
                      >{{ initials(client.full_name) }}</span
                    >
                    <span class="grow list-title truncate">{{ client.full_name }}</span>
                    @if (client.phone) {
                      <a
                        class="btn btn-whatsapp btn-sm"
                        [href]="birthdayLink(client)"
                        target="_blank"
                        rel="noopener"
                        aria-label="Felicitar por WhatsApp"
                      >
                        <app-icon name="message-circle" [size]="16" />
                        Felicitar
                      </a>
                    }
                  </li>
                }
              </ul>
            }
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .new-bookings {
        border-color: var(--c-success);
        background: linear-gradient(180deg, var(--c-success-soft) 0%, var(--c-surface) 70px);
      }
      .dash-grid {
        display: grid;
        gap: 20px;
        grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
        align-items: start;
      }
      .side .list-row {
        padding: 12px 20px;
      }
      .side-empty {
        padding: 6px 20px 20px;
        color: var(--c-text-3);
        font-size: 14px;
      }
      @media (max-width: 1100px) {
        .dash-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 959px) {
        .hide-mobile {
          display: none;
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);
  private readonly toast = inject(ToastService);
  readonly online = inject(OnlineBookingsService);
  private readonly settings = inject(SettingsService);
  private readonly recontact = inject(RecontactService);

  readonly greetingText = greeting();
  readonly todayLabel = formatDayLong(new Date());

  loading = signal(true);
  appointments = signal<TodayAppointment[]>([]);
  alerts = signal<LoyaltyAlertRow[]>([]);
  birthdays = signal<BirthdayClient[]>([]);
  monthTotal = signal(0);
  monthCount = signal(0);

  pendingBenefits = computed(() => this.alerts().filter((a) => a.benefit_pending).length);

  returningCount = signal(0);
  returningLabel = signal('3 semanas');

  formatCurrency = formatCurrency;
  formatTime = formatTime;
  formatDuration = formatDuration;
  statusMeta = statusMeta;
  initials = initials;
  avatar = avatarColors;

  async ngOnInit() {
    const ownerId = this.auth.currentUser()?.id;
    if (!ownerId) return;

    const now = new Date();
    try {
      const [appointments, alerts, birthdays, summary] = await Promise.all([
        this.dashboard.getTodayAppointments(ownerId),
        this.dashboard.getLoyaltyAlerts(ownerId),
        this.dashboard.getBirthdaysToday(ownerId),
        this.dashboard.getMonthSummary(ownerId, now.getFullYear(), now.getMonth() + 1),
      ]);
      this.appointments.set(appointments);
      this.alerts.set(alerts);
      this.birthdays.set(birthdays);
      this.monthTotal.set(summary.total);
      this.monthCount.set(summary.count);
    } catch {
      this.toast.error('No se pudo cargar el resumen. Revisa tu conexión.');
    } finally {
      this.loading.set(false);
    }
    void this.loadReturning(ownerId);
  }

  // Secondary info: loaded after the main content and never blocks or errors out the page.
  private async loadReturning(ownerId: string) {
    try {
      const { days } = await this.settings.getRecontact(ownerId);
      const overdue = await this.recontact.getOverdue(ownerId, days);
      const recent = Date.now() - 14 * 86_400_000;
      this.returningCount.set(overdue.filter((o) => !o.lastContactedAt || o.lastContactedAt.getTime() < recent).length);
      this.returningLabel.set(
        ({ 21: '3 semanas', 30: '1 mes', 60: '2 meses', 90: '3 meses' } as Record<number, string>)[days] ?? `${days} días`
      );
    } catch {
      /* the card just stays hidden */
    }
  }

  dayLabel(iso: string): string {
    return relativeDayLabel(iso).split(',')[0];
  }

  alertText(alert: LoyaltyAlertRow): string {
    if (alert.benefit_pending) {
      return alert.pending_benefit_type === 'gift'
        ? 'Obsequio listo para su próxima cita'
        : `${alert.pending_benefit_value}% de descuento listo`;
    }
    return alert.alert_message ?? 'A una sesión de su próximo beneficio';
  }

  birthdayLink(client: BirthdayClient): string {
    return buildBirthdayUri(client.phone ?? '', client.full_name);
  }

  async copyBookingLink() {
    const ok = await copyToClipboard(bookingUrl());
    if (ok) this.toast.success('Link de reservas copiado');
    else this.toast.show(bookingUrl(), 'info');
  }
}
