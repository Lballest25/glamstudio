import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatCurrency } from '../../core/utils/currency.util';
import { buildAppointmentReminderUri } from '../../core/utils/whatsapp.util';
import { AppointmentDetail, AppointmentsService, STATUS_LABELS } from './appointments.service';

@Component({
  selector: 'app-appointment-detail',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    @if (appointment(); as appt) {
      <div class="page-header">
        <h1>{{ appt.client_name }}</h1>
        <span class="badge">{{ statusLabel(appt.status) }}</span>
      </div>

      <div class="card" style="max-width: 480px; margin-bottom:16px;">
        <p><strong>Fecha:</strong> {{ formatDate(appt.scheduled_at) }}</p>
        @if (appt.notes) {
          <p><strong>Notas:</strong> {{ appt.notes }}</p>
        }
        <p><strong>Servicios:</strong></p>
        <ul>
          @for (line of appt.services; track line.service_id) {
            <li>{{ line.service_name }} — {{ formatCurrency(line.price_at_time) }} x{{ line.quantity }}</li>
          }
        </ul>
        @if (appt.status === 'completed') {
          <p style="color: var(--color-success); font-weight:700;">
            Completada · {{ formatCurrency(appt.total_amount ?? 0) }}
          </p>
        }
      </div>

      @if (appt.status !== 'completed' && appt.status !== 'cancelled') {
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px;">
          @if (appt.client_phone) {
            <a class="btn" [href]="reminderLink(appt)" target="_blank" rel="noopener">Enviar recordatorio WhatsApp</a>
          }
          <button class="btn" (click)="showReschedule.set(!showReschedule())">Reagendar</button>
          <button class="btn btn-danger" (click)="cancel()">Cancelar cita</button>
          <a class="btn btn-primary" [routerLink]="['/admin/citas', appt.id, 'completar']">Completar y cobrar</a>
        </div>
      }

      @if (showReschedule()) {
        <div class="card" style="max-width: 360px;">
          <div style="display:flex; gap:12px;">
            <label class="field" style="flex:1;">
              Fecha
              <input type="date" [(ngModel)]="newDate" />
            </label>
            <label class="field" style="flex:1;">
              Hora
              <input type="time" [(ngModel)]="newTime" />
            </label>
          </div>
          @if (errorMessage()) {
            <p class="error-text">{{ errorMessage() }}</p>
          }
          <button class="btn btn-primary" (click)="reschedule()">Confirmar nuevo horario</button>
        </div>
      }
    } @else if (loading()) {
      <p class="hint">Cargando…</p>
    } @else {
      <p class="empty-state">No se encontró la cita.</p>
    }
  `,
})
export class AppointmentDetailComponent implements OnInit {
  loading = signal(true);
  appointment = signal<AppointmentDetail | null>(null);
  showReschedule = signal(false);
  errorMessage = signal<string | null>(null);
  newDate = '';
  newTime = '';

  formatCurrency = formatCurrency;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly appointmentsService: AppointmentsService
  ) {}

  async ngOnInit() {
    await this.reload();
  }

  private async reload() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loading.set(true);
    const appt = await this.appointmentsService.getAppointmentById(id);
    this.appointment.set(appt);
    if (appt) {
      const d = new Date(appt.scheduled_at);
      this.newDate = d.toISOString().slice(0, 10);
      this.newTime = d.toTimeString().slice(0, 5);
    }
    this.loading.set(false);
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status;
  }

  formatDate(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(iso));
  }

  reminderLink(appt: AppointmentDetail): string {
    return buildAppointmentReminderUri(appt.client_phone ?? '', appt.client_name, new Date(appt.scheduled_at));
  }

  async reschedule() {
    const appt = this.appointment();
    if (!appt || !this.newDate || !this.newTime) return;
    this.errorMessage.set(null);
    try {
      await this.appointmentsService.rescheduleAppointment(appt.id, new Date(`${this.newDate}T${this.newTime}:00`));
      this.showReschedule.set(false);
      await this.reload();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo reagendar.');
    }
  }

  async cancel() {
    const appt = this.appointment();
    if (!appt) return;
    await this.appointmentsService.cancelAppointment(appt.id);
    await this.reload();
  }
}
