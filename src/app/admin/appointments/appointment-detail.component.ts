import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OnlineBookingsService } from '../../core/services/online-bookings.service';
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
import { pickGiftLine } from '../../core/utils/gift.util';
import { CATEGORY_ORDER, categoryMeta, statusMeta } from '../../core/utils/labels';
import { buildAppointmentReminderUri } from '../../core/utils/whatsapp.util';
import { IconComponent } from '../../shared/components/icon.component';
import { SheetComponent } from '../../shared/components/sheet.component';
import { CatalogService, ServiceRow } from '../catalog/catalog.service';
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
              <button type="button" class="btn" (click)="openEditServices(a)">
                <app-icon name="pencil" [size]="18" />
                Servicios
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
              @if (a.discount_pct > 0 || discountAmount(a) > 0) {
                <div class="row-between muted">
                  <span>Subtotal</span><span class="num">{{ formatCurrency(a.subtotal ?? subtotal(a)) }}</span>
                </div>
                <div class="row-between discount">
                  <span>
                    {{ a.discount_pct > 0 ? 'Descuento fidelización (' + a.discount_pct + '%)' : 'Obsequio (' + giftName(a) + ')' }}
                  </span>
                  <span class="num">−{{ formatCurrency(discountAmount(a)) }}</span>
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

        <app-sheet [open]="servicesOpen()" title="Editar servicios" (closed)="servicesOpen.set(false)">
          <div class="stack">
            @if (loadingCatalog()) {
              <span class="skeleton" style="height: 64px; border-radius: 14px"></span>
              <span class="skeleton" style="height: 64px; border-radius: 14px"></span>
            } @else {
              @for (group of serviceGroups(); track group.category) {
                <p class="section-title">{{ meta(group.category).label }}</p>
                <div class="service-pick">
                  @for (s of group.items; track s.id) {
                    <button
                      type="button"
                      class="pick"
                      [class.is-selected]="pickedIds().has(s.id)"
                      [attr.aria-pressed]="pickedIds().has(s.id)"
                      (click)="togglePicked(s.id)"
                    >
                      <span class="grow">
                        <span class="pick-name">{{ s.name }}@if (!s.is_active) { <span class="subtle"> (oculto)</span> }</span>
                        <span class="pick-meta">{{ formatDuration(s.duration_min) }} · {{ formatCurrency(priceFor(a, s)) }}</span>
                      </span>
                      <span class="pick-check"><app-icon name="check" [size]="13" [stroke]="3" /></span>
                    </button>
                  }
                </div>
              }
              <div class="row-between edit-total">
                <span class="muted">{{ pickedIds().size === 1 ? '1 servicio' : pickedIds().size + ' servicios' }}</span>
                <strong class="num">{{ formatCurrency(pickedTotal(a)) }}</strong>
              </div>
            }

            @if (errorMessage()) {
              <div class="alert alert-danger">
                <app-icon name="alert-circle" [size]="18" />
                <span>{{ errorMessage() }}</span>
              </div>
            }
            <button
              type="button"
              class="btn btn-primary btn-lg btn-block"
              [disabled]="saving() || pickedIds().size === 0 || !servicesChanged(a)"
              (click)="saveServices(a)"
            >
              @if (saving()) {
                <span class="spinner"></span>
              }
              Guardar servicios
            </button>
          </div>
        </app-sheet>

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
      .service-pick {
        display: grid;
        gap: 8px;
      }
      .pick {
        display: flex;
        align-items: center;
        gap: 12px;
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
      .pick.is-selected {
        border-color: var(--c-primary);
        background: var(--c-primary-soft);
      }
      .pick-name {
        display: block;
        font-weight: 700;
        font-size: 14px;
      }
      .pick-meta {
        display: block;
        font-size: 12.5px;
        color: var(--c-text-2);
        margin-top: 2px;
      }
      .pick-check {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid var(--c-border-strong);
        display: grid;
        place-items: center;
        color: transparent;
        flex-shrink: 0;
      }
      .pick.is-selected .pick-check {
        background: var(--c-primary);
        border-color: var(--c-primary);
        color: #fff;
      }
      .edit-total {
        padding-top: 4px;
        font-size: 15px;
      }
    `,
  ],
})
export class AppointmentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly online = inject(OnlineBookingsService);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly catalogService = inject(CatalogService);
  private readonly toast = inject(ToastService);

  loading = signal(true);
  saving = signal(false);
  cancelling = signal(false);
  appointment = signal<AppointmentDetail | null>(null);
  rescheduleOpen = signal(false);
  errorMessage = signal<string | null>(null);
  newDate = '';
  newTime = '';

  servicesOpen = signal(false);
  loadingCatalog = signal(false);
  catalog = signal<ServiceRow[]>([]);
  pickedIds = signal<Set<string>>(new Set());
  serviceGroups = computed(() =>
    CATEGORY_ORDER.map((category) => ({ category, items: this.catalog().filter((s) => s.category === category) })).filter(
      (g) => g.items.length > 0
    )
  );

  formatCurrency = formatCurrency;
  formatDayLong = formatDayLong;
  formatDuration = formatDuration;
  statusMeta = statusMeta;
  meta = categoryMeta;
  avatar = avatarColors;
  initials = initials;

  async ngOnInit() {
    await this.reload();
  }

  private async reload() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    try {
      const appt = await this.appointmentsService.getAppointmentById(id);
      this.appointment.set(appt);
      // Opening a new online booking counts as having seen it.
      if (appt?.source === 'online' && !appt.acknowledged_at) void this.online.markSeen(appt.id);
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

  // Amount knocked off a completed appointment (percentage discount or gift).
  discountAmount(a: AppointmentDetail): number {
    if (a.status !== 'completed') return 0;
    return Math.max(0, (a.subtotal ?? this.subtotal(a)) - (a.total_amount ?? 0));
  }

  giftName(a: AppointmentDetail): string {
    return pickGiftLine(a.services)?.service_name ?? 'servicio';
  }

  // --- edit services ------------------------------------------------------

  async openEditServices(a: AppointmentDetail) {
    const ownerId = this.auth.currentUser()?.id;
    if (!ownerId) return;

    this.errorMessage.set(null);
    this.pickedIds.set(new Set(a.services.map((s) => s.service_id)));
    this.servicesOpen.set(true);
    this.loadingCatalog.set(true);
    try {
      const current = new Set(a.services.map((s) => s.service_id));
      const all = await this.catalogService.getAllServices(ownerId);
      // Hidden services only stay in the list if they're already on this appointment.
      this.catalog.set(all.filter((s) => s.is_active || current.has(s.id)));
    } catch {
      this.servicesOpen.set(false);
      this.toast.error('No se pudo cargar el catálogo.');
    } finally {
      this.loadingCatalog.set(false);
    }
  }

  togglePicked(id: string) {
    const next = new Set(this.pickedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.pickedIds.set(next);
  }

  // Kept services keep the price they were booked at; only new ones use today's price.
  priceFor(a: AppointmentDetail, s: ServiceRow): number {
    return a.services.find((l) => l.service_id === s.id)?.price_at_time ?? s.base_price;
  }

  pickedTotal(a: AppointmentDetail): number {
    const picked = this.pickedIds();
    return this.catalog()
      .filter((s) => picked.has(s.id))
      .reduce((sum, s) => {
        const line = a.services.find((l) => l.service_id === s.id);
        return sum + (line ? line.price_at_time * line.quantity : s.base_price);
      }, 0);
  }

  servicesChanged(a: AppointmentDetail): boolean {
    const picked = this.pickedIds();
    const current = new Set(a.services.map((s) => s.service_id));
    return picked.size !== current.size || [...picked].some((id) => !current.has(id));
  }

  async saveServices(a: AppointmentDetail) {
    const picked = this.pickedIds();
    if (picked.size === 0 || !this.servicesChanged(a)) return;

    const current = new Set(a.services.map((s) => s.service_id));
    const add = this.catalog()
      .filter((s) => picked.has(s.id) && !current.has(s.id))
      .map((s) => ({ service_id: s.id, price_at_time: s.base_price }));
    const remove = [...current].filter((id) => !picked.has(id));

    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      await this.appointmentsService.updateServices(a.id, add, remove, a.subtotal !== null ? this.pickedTotal(a) : null);
      this.servicesOpen.set(false);
      this.toast.success('Servicios actualizados');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudieron actualizar los servicios.');
    } finally {
      this.saving.set(false);
      // Reload either way: a failure between steps can leave the appointment half-edited.
      await this.reload();
    }
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
