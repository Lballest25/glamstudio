import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppointmentsService, ClientAppointment, STATUS_LABELS } from './appointments.service';

interface DayGroup {
  dateKey: string;
  label: string;
  appointments: ClientAppointment[];
}

@Component({
  selector: 'app-appointments-calendar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-header">
      <h1>Citas</h1>
      <a class="btn btn-primary" routerLink="nueva">+ Nueva cita</a>
    </div>

    <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
      <button class="btn btn-sm" (click)="shiftMonth(-1)">&larr; Mes anterior</button>
      <strong>{{ monthLabel() }}</strong>
      <button class="btn btn-sm" (click)="shiftMonth(1)">Mes siguiente &rarr;</button>
    </div>

    @if (loading()) {
      <p class="hint">Cargando…</p>
    } @else if (dayGroups().length === 0) {
      <p class="empty-state">Sin citas este mes.</p>
    } @else {
      @for (group of dayGroups(); track group.dateKey) {
        <h3 style="margin-bottom:8px;">{{ group.label }}</h3>
        <ul class="list" style="margin-bottom:20px;">
          @for (appt of group.appointments; track appt.id) {
            <li class="list-item" [routerLink]="[appt.id]">
              <span style="font-weight:700; min-width:70px;">{{ formatTime(appt.scheduled_at) }}</span>
              <span style="flex:1; font-weight:600;">{{ appt.client_name }}</span>
              <span class="badge" [class]="'status-' + appt.status">{{ statusLabel(appt.status) }}</span>
            </li>
          }
        </ul>
      }
    }
  `,
  styles: [
    `
      .status-completed {
        background: var(--color-success);
        color: white;
      }
      .status-cancelled,
      .status-no_show {
        opacity: 0.6;
      }
      .status-in_progress {
        background: var(--color-info);
        color: white;
      }
    `,
  ],
})
export class AppointmentsCalendarComponent implements OnInit {
  loading = signal(true);
  dayGroups = signal<DayGroup[]>([]);
  private cursor = new Date();

  constructor(private readonly auth: AuthService, private readonly appointmentsService: AppointmentsService) {}

  async ngOnInit() {
    await this.reload();
  }

  monthLabel(): string {
    return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(this.cursor);
  }

  async shiftMonth(delta: number) {
    this.cursor = new Date(this.cursor.getFullYear(), this.cursor.getMonth() + delta, 1);
    await this.reload();
  }

  private async reload() {
    const ownerId = this.auth.currentUser()?.id;
    if (!ownerId) return;
    this.loading.set(true);

    const appointments = await this.appointmentsService.getAppointmentsByMonth(
      ownerId,
      this.cursor.getFullYear(),
      this.cursor.getMonth() + 1
    );

    const groups = new Map<string, ClientAppointment[]>();
    for (const appt of appointments.filter((a) => a.status !== 'cancelled')) {
      const key = appt.scheduled_at.slice(0, 10);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(appt);
    }

    this.dayGroups.set(
      [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, appts]) => ({
          dateKey,
          label: new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(
            new Date(dateKey + 'T00:00:00')
          ),
          appointments: appts,
        }))
    );
    this.loading.set(false);
  }

  formatTime(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true }).format(
      new Date(iso)
    );
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status;
  }
}
