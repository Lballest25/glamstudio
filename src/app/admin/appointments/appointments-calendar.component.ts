import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  formatDuration,
  formatMonthYear,
  formatTime,
  parseISODate,
  plural,
  relativeDayLabel,
  toLocalISODate,
} from '../../core/utils/format.util';
import { statusMeta } from '../../core/utils/labels';
import { IconComponent } from '../../shared/components/icon.component';
import { AppointmentsService, ClientAppointment } from './appointments.service';

interface DayCell {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  count: number;
}

@Component({
  selector: 'app-appointments-calendar',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page fade-in">
      <header class="page-header">
        <div>
          <h1>Agenda</h1>
          <p class="page-subtitle">{{ plural(monthActiveCount(), 'cita', 'citas') }} en {{ monthLabel().toLowerCase() }}</p>
        </div>
        <a class="btn btn-primary" routerLink="/admin/citas/nueva" [queryParams]="{ date: selectedKey() }">
          <app-icon name="plus" [size]="18" />
          Nueva cita
        </a>
      </header>

      <div class="agenda">
        <section class="card cal">
          <div class="cal-head">
            <h2>{{ monthLabel() }}</h2>
            <div class="row" style="gap: 4px">
              <button type="button" class="btn btn-ghost btn-icon btn-sm" (click)="shiftMonth(-1)" aria-label="Mes anterior">
                <app-icon name="chevron-left" [size]="18" />
              </button>
              <button type="button" class="btn btn-sm" (click)="goToday()">Hoy</button>
              <button type="button" class="btn btn-ghost btn-icon btn-sm" (click)="shiftMonth(1)" aria-label="Mes siguiente">
                <app-icon name="chevron-right" [size]="18" />
              </button>
            </div>
          </div>

          <div class="cal-grid weekdays" aria-hidden="true">
            @for (w of weekdays; track $index) {
              <span>{{ w }}</span>
            }
          </div>
          <div class="cal-grid">
            @for (cell of cells(); track cell.key) {
              <button
                type="button"
                class="cal-day"
                [class.out]="!cell.inMonth"
                [class.today]="cell.isToday"
                [class.selected]="cell.key === selectedKey()"
                (click)="select(cell)"
                [attr.aria-label]="cell.day + (cell.count ? ', ' + cell.count + ' citas' : '')"
                [attr.aria-pressed]="cell.key === selectedKey()"
              >
                <span class="num">{{ cell.day }}</span>
                <span class="dots">
                  @for (d of dots(cell.count); track $index) {
                    <i></i>
                  }
                </span>
              </button>
            }
          </div>
        </section>

        <section class="card day-panel">
          <div class="card-head">
            <div>
              <h2>{{ selectedLabel() }}</h2>
              <p class="subtle small">
                @if (loading()) {
                  Cargando…
                } @else {
                  {{ selectedActiveCount() === 0 ? 'Sin citas' : plural(selectedActiveCount(), 'cita', 'citas') }}
                }
              </p>
            </div>
          </div>

          @if (loading()) {
            @for (i of [1, 2, 3]; track i) {
              <div class="skeleton-row">
                <span class="skeleton" style="width: 64px; height: 34px"></span>
                <span class="grow"><span class="skeleton" style="height: 14px; width: 60%"></span></span>
              </div>
            }
          } @else if (selectedAppointments().length === 0) {
            <div class="empty">
              <span class="empty-icon"><app-icon name="calendar" [size]="26" /></span>
              <span class="empty-title">Día disponible</span>
              <span>No hay citas agendadas.</span>
              <a class="btn btn-soft btn-sm" routerLink="/admin/citas/nueva" [queryParams]="{ date: selectedKey() }">
                <app-icon name="plus" [size]="16" />
                Agendar aquí
              </a>
            </div>
          } @else {
            <ul class="list">
              @for (appt of selectedAppointments(); track appt.id) {
                <li>
                  <a class="list-row" [class.is-muted]="appt.status === 'cancelled'" [routerLink]="['/admin/citas', appt.id]">
                    <span class="time-block">
                      <span class="time">{{ formatTime(appt.scheduled_at) }}</span>
                      <span class="dur">{{ formatDuration(appt.duration_min) }}</span>
                    </span>
                    <span class="grow">
                      <span class="list-title truncate" style="display: block">{{ appt.client_name }}</span>
                      <span class="list-sub truncate" style="display: block">{{
                        appt.service_names.join(' · ') || 'Sin servicios'
                      }}</span>
                    </span>
                    <span [class]="'badge ' + statusMeta(appt.status).badge">{{ statusMeta(appt.status).label }}</span>
                    <app-icon name="chevron-right" [size]="18" class="chev" />
                  </a>
                </li>
              }
            </ul>
          }
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      .agenda {
        display: grid;
        gap: 20px;
        grid-template-columns: minmax(300px, 400px) minmax(0, 1fr);
        align-items: start;
      }
      .cal {
        padding: 16px 16px 12px;
      }
      .cal-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 2px 4px 12px;
      }
      .cal-head h2 {
        font-family: var(--f-display);
        font-weight: 600;
        font-size: 20px;
      }
      .cal-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
      }
      .weekdays span {
        text-align: center;
        font-size: 11.5px;
        font-weight: 800;
        color: var(--c-text-3);
        padding: 4px 0 6px;
      }
      .cal-day {
        aspect-ratio: 1;
        min-height: 40px;
        border: 0;
        border-radius: var(--r-md);
        background: transparent;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        cursor: pointer;
        transition: background 0.12s;
      }
      .cal-day:hover {
        background: var(--c-surface-2);
      }
      .cal-day .num {
        font-size: 14px;
        font-weight: 700;
        line-height: 1;
      }
      .cal-day.out {
        opacity: 0.35;
      }
      .cal-day.today .num {
        color: var(--c-primary);
        font-weight: 800;
      }
      .cal-day.today:not(.selected) {
        box-shadow: inset 0 0 0 1.5px var(--c-primary-soft-2);
      }
      .cal-day.selected {
        background: var(--c-primary);
        box-shadow: 0 8px 16px -8px rgba(123, 86, 166, 0.8);
      }
      .cal-day.selected .num {
        color: #fff;
      }
      .dots {
        display: flex;
        gap: 3px;
        height: 5px;
      }
      .dots i {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--c-primary-brand);
      }
      .cal-day.selected .dots i {
        background: #fff;
      }
      @media (max-width: 999px) {
        .agenda {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AppointmentsCalendarComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly toast = inject(ToastService);

  readonly weekdays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  loading = signal(true);
  monthCursor = signal(this.startOfMonth(new Date()));
  selectedKey = signal(toLocalISODate(new Date()));
  appointments = signal<ClientAppointment[]>([]);

  byDay = computed(() => {
    const map = new Map<string, ClientAppointment[]>();
    for (const appt of this.appointments()) {
      const key = toLocalISODate(new Date(appt.scheduled_at));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(appt);
    }
    return map;
  });

  cells = computed<DayCell[]>(() => {
    const first = this.monthCursor();
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil((first.getDay() + daysInMonth) / 7);
    const todayKey = toLocalISODate(new Date());
    const byDay = this.byDay();

    return Array.from({ length: weeks * 7 }, (_, i) => {
      const date = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay() + i);
      const key = toLocalISODate(date);
      return {
        key,
        day: date.getDate(),
        inMonth: date.getMonth() === first.getMonth(),
        isToday: key === todayKey,
        count: (byDay.get(key) ?? []).filter((a) => a.status !== 'cancelled').length,
      };
    });
  });

  monthLabel = computed(() => formatMonthYear(this.monthCursor()));
  monthActiveCount = computed(() => this.appointments().filter((a) => a.status !== 'cancelled').length);
  selectedAppointments = computed(() => this.byDay().get(this.selectedKey()) ?? []);
  selectedActiveCount = computed(() => this.selectedAppointments().filter((a) => a.status !== 'cancelled').length);
  selectedLabel = computed(() => relativeDayLabel(parseISODate(this.selectedKey())));

  formatTime = formatTime;
  formatDuration = formatDuration;
  statusMeta = statusMeta;
  plural = plural;

  async ngOnInit() {
    await this.reload();
  }

  dots(count: number): number[] {
    return Array.from({ length: Math.min(count, 3) }, (_, i) => i);
  }

  async shiftMonth(delta: number) {
    const cursor = this.monthCursor();
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
    this.monthCursor.set(next);
    const today = new Date();
    const isCurrentMonth = next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth();
    this.selectedKey.set(toLocalISODate(isCurrentMonth ? today : next));
    await this.reload();
  }

  async goToday() {
    const today = new Date();
    const cursor = this.monthCursor();
    this.selectedKey.set(toLocalISODate(today));
    if (cursor.getFullYear() !== today.getFullYear() || cursor.getMonth() !== today.getMonth()) {
      this.monthCursor.set(this.startOfMonth(today));
      await this.reload();
    }
  }

  async select(cell: DayCell) {
    if (cell.inMonth) {
      this.selectedKey.set(cell.key);
      return;
    }
    const date = parseISODate(cell.key);
    this.monthCursor.set(this.startOfMonth(date));
    this.selectedKey.set(cell.key);
    await this.reload();
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private async reload() {
    const ownerId = this.auth.currentUser()?.id;
    if (!ownerId) return;
    this.loading.set(true);
    try {
      const cursor = this.monthCursor();
      this.appointments.set(
        await this.appointmentsService.getAppointmentsByMonth(ownerId, cursor.getFullYear(), cursor.getMonth() + 1)
      );
    } catch {
      this.toast.error('No se pudo cargar la agenda.');
    } finally {
      this.loading.set(false);
    }
  }
}
