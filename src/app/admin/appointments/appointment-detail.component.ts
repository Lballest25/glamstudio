import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../../core/services/toast.service';
import { formatCurrency } from '../../core/utils/currency.util';
import {
  avatarColors,
  formatDayLong,
  formatDuration,
  formatTime,
  initials,
  toLocalISODate,
  toLocalTime,
} from '../../core/utils/format.util';
import { statusMeta } from '../../core/utils/labels';
import { buildAppointmentReminderUri } from '../../core/utils/whatsapp.util';
import { IconComponent } from '../../shared/components/icon.component';
import { SheetComponent } from '../../shared/components/sheet.component';
import { AppointmentDetail, AppointmentsService } from './appointments.service';

@Component({
  selector: 'app-appointment-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, SheetComponent],
  template: `
    <div class="page page-narrow fade-in">
      <a class="back-link" routerLink="/admin/citas">
        <app-icon name="arrow-left" [size]="18" />
        Agenda
      </a>

      @if (appointment(); as a) {
        <section class="card card-pad hero">
          <div class="row row-wrap">
            <span [class]="'badge ' + statusMeta(a.status).badge">{{ statusMeta(a.status).label }}</span>
            @if (a.is_benefit_session) {
              <span class="badge badge-gold"><app-icon name="gift" [size]="13" /> Sesión de beneficio</span>
            }
          </div>

          <a class="client" [routerLink]="['/admin/clientas', a.client_id]">
            <span class="avatar" [style.background]="avatar(a.client_name).bg" [style.color]="avatar(a.client_name).fg">{{
              initials(a.client_name)
            }}</span>
            <span class="grow">
              <h1>{{ a.client_name }}</h1>
              @if (a.client_phone) {
                <span class="muted small">{{ a.client_phone }}</span>
              }
            </span>
            <app-icon name="chevron-right" [size]="18" class="chev" />
          </a>

          <div class="when">
            <div class="when-item">
              <span class="tile tone-primary"><app-icon name="calendar" [size]="18" /></span>
              <span>
                <span class="when-label">Fecha</span>
                <span class="when-value">{{ formatDayLong(a.scheduled_at) }}</span>
              </span>
            </div>
            <div class="when-item">
              <span class="tile tone-primary"><app-icon name="clock" [size]="18" /></span>
              <span>
                <span class="when-label">Hora</span>
                <span class="when-value">{{ timeRange(a) }}</span>
              </span>
            </div>
          </div>

          @if (isActive(a)) {
            <a class="btn btn-primary btn-lg btn-block" [routerLink]="['/admin/citas', a.id, 'completar']">
              <app-icon name="wallet" [size]="20" />
              Completar y cobrar
            </a>
            <div class="actions">
              @if (a.client_phone) {
                <a class="btn btn-whatsapp" [href]="reminderLink(a)" target="_blank" rel="noopener">
                  <app-icon name="message-circle" [size]="18" />
                  Recordatorio
                </a>
              }
              <button type="button" class="btn" (click)="openReschedule(a)">
                <app-icon name="calendar-clock" [size]="18" />
                Reagendar
              </button>
              <button type="button" class="btn btn-danger" [disabled]="cancelling()" (click)="cancel(a)">
                <app-icon name="ban" [size]="18" />
                Cancelar
              </button>
            </div>
          }
        </section>

        <section class="card">
          <div class="card-head"><h2>Servicios</h2></div>
          <ul class="list">
            @for (line of a.services; track line.service_id) {
              <li class="list-row">
                <span class="grow">
                  <span class="list-title" style="display: block">{{ line.service_name }}</span>
                  @if (line.quantity > 1) {
                    <span class="list-sub" style="display: block">x{{ line.quantity }}</span>
                  }
                </span>
                <span class="num strong">{{ formatCurrency(line.price_at_time * line.quantity) }}</span>
              </li>
            }
          </ul>
          <div class="totals">
            @if (a.status === 'completed') {
              @if (a.discount_pct > 0) {
                <div class="row-between muted">
                  <span>Subtotal</span><span class="num">{{ formatCurrency(a.subtotal ?? subtotal(a)) }}</span>
                </div>
                <div class="row-between discount">
                  <span>Descuento fidelización ({{ a.discount_pct }}%)</span>
                  <span class="num">−{{ formatCurrency((a.subtotal ?? subtotal(a)) - (a.total_amount ?? 0)) }}</span>
                </div>
              }
              <div class="row-between grand">
                <span>Total cobrado</span><span class="num">{{ formatCurrency(a.total_amount ?? 0) }}</span>
              </div>
            } @else {
              <div class="row-between grand">
                <span>Total estimado</span><span class="num">{{ formatCurrency(subtotal(a)) }}</span>
              </div>
            }
          </div>
        </section>

        @if (a.notes) {
          <section class="card card-pad">
            <h3>Notas</h3>
            <p class="muted notes">{{ a.notes }}</p>
          </section>
        }

        <app-sheet [open]="rescheduleOpen()" title="Reagendar cita" (closed)="rescheduleOpen.set(false)">
          <div class="stack">
            <div class="form-grid">
              <label class="field">
                <span class="field-label">Fecha</span>
                <input class="input" type="date" [(ngModel)]="newDate" />
              </label>
              <label class="field">
                <span class="field-label">Hora</span>
                <input class="input" type="time" step="900" [(ngModel)]="newTime" />
              </label>
            </div>
            @if (errorMessage()) {
              <div class="alert alert-danger">
                <app-icon name="alert-circle" [size]="18" />
                <span>{{ errorMessage() }}</span>
              </div>
            }
            <button type="button" class="btn btn-primary btn-lg btn-block" [disabled]="saving()" (click)="reschedule(a)">
              @if (saving()) {
                <span class="spinner"></span>
              }
              Confirmar nuevo horario
            </button>
          </div>
        </app-sheet>
      } @else if (loading()) {
        <div class="card card-pad stack">
          <span class="skeleton" style="height: 24px; width: 30%"></span>
          <span class="skeleton" style="height: 34px; width: 60%"></span>
          <span class="skeleton" style="height: 64px"></span>
        </div>
      } @else {
        <div class="card empty">
          <span class="empty-icon"><app-icon name="calendar" [size]="26" /></span>
          <span class="empty-title">No encontramos esta cita</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .hero {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .client {
        display: flex;
        align-items: center;
        gap: 14px;
        color: inherit;
        margin: -6px;
        padding: 6px;
        border-radius: var(--r-md);
      }
      .client:hover {
        background: var(--c-surface-2);
      }
      .client h1 {
        font-size: 26px;
      }
      .when {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px;
      }
      .when-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: var(--r-md);
        background: var(--c-surface-2);
      }
      .when-label {
        display: block;
        font-size: 12px;
        font-weight: 700;
        color: var(--c-text-3);
      }
      .when-value {
        display: block;
        font-weight: 700;
      }
      .when .tile {
        width: 38px;
        height: 38px;
        background: var(--c-surface);
      }
      .actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 8px;
        margin-top: -8px;
      }
      .totals {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 14px 20px 18px;
        border-top: 1px solid var(--c-border);
        background: var(--c-surface-2);
      }
      .discount {
        color: var(--c-gold);
        font-weight: 700;
      }
      .grand {
        font-weight: 800;
        font-size: 17px;
      }
      .notes {
        margin-top: 6px;
        white-space: pre-line;
      }
    `,
  ],
})
export class AppointmentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly toast = inject(ToastService);

  loading = signal(true);
  saving = signal(false);
  cancelling = signal(false);
  appointment = signal<AppointmentDetail | null>(null);
  rescheduleOpen = signal(false);
  errorMessage = signal<string | null>(null);
  newDate = '';
  newTime = '';

  formatCurrency = formatCurrency;
  formatDayLong = formatDayLong;
  statusMeta = statusMeta;
  avatar = avatarColors;
  initials = initials;

  async ngOnInit() {
    await this.reload();
  }

  private async reload() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    try {
      this.appointment.set(await this.appointmentsService.getAppointmentById(id));
    } catch {
      this.toast.error('No se pudo cargar la cita.');
    } finally {
      this.loading.set(false);
    }
  }

  isActive(a: AppointmentDetail): boolean {
    return a.status === 'scheduled' || a.status === 'in_progress';
  }

  subtotal(a: AppointmentDetail): number {
    return a.services.reduce((sum, s) => sum + s.price_at_time * s.quantity, 0);
  }

  timeRange(a: AppointmentDetail): string {
    const start = formatTime(a.scheduled_at);
    if (!a.ends_at) return start;
    return `${start} – ${formatTime(a.ends_at)} · ${formatDuration(a.duration_min)}`;
  }

  reminderLink(a: AppointmentDetail): string {
    return buildAppointmentReminderUri(a.client_phone ?? '', a.client_name, new Date(a.scheduled_at));
  }

  openReschedule(a: AppointmentDetail) {
    const d = new Date(a.scheduled_at);
    this.newDate = toLocalISODate(d);
    this.newTime = toLocalTime(d);
    this.errorMessage.set(null);
    this.rescheduleOpen.set(true);
  }

  async reschedule(a: AppointmentDetail) {
    if (!this.newDate || !this.newTime) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      await this.appointmentsService.rescheduleAppointment(a.id, new Date(`${this.newDate}T${this.newTime}:00`));
      this.rescheduleOpen.set(false);
      this.toast.success('Cita reagendada');
      await this.reload();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo reagendar.');
    } finally {
      this.saving.set(false);
    }
  }

  async cancel(a: AppointmentDetail) {
    if (!confirm(`¿Cancelar la cita de ${a.client_name}?`)) return;
    this.cancelling.set(true);
    try {
      await this.appointmentsService.cancelAppointment(a.id);
      this.toast.success('Cita cancelada');
      await this.reload();
    } catch {
      this.toast.error('No se pudo cancelar la cita.');
    } finally {
      this.cancelling.set(false);
    }
  }
}
