import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { applyDiscount, formatCurrency } from '../../core/utils/currency.util';
import { LoyaltyProgressRow, LoyaltyService } from '../loyalty/loyalty.service';
import { AppointmentDetail, AppointmentsService } from './appointments.service';

type PaymentMethod = 'cash' | 'transfer' | 'card';

@Component({
  selector: 'app-complete-appointment',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (appointment(); as appt) {
      <h1>Completar y cobrar</h1>
      <p class="hint">{{ appt.client_name }} · {{ formatDate(appt.scheduled_at) }}</p>

      @if (isGift()) {
        <div class="card badge-gold" style="max-width:420px; margin:16px 0; text-align:center;">
          <strong>🎁 Sesión de obsequio</strong>
          <p class="hint">Esta clienta completó su ciclo de fidelización — esta sesión es gratis.</p>
        </div>
      } @else if (discountPct() > 0) {
        <div class="card badge-gold" style="max-width:420px; margin:16px 0; text-align:center;">
          <strong>¡{{ discountPct() }}% de descuento aplicado! 🎉</strong>
        </div>
      }

      <div class="card" style="max-width:420px;">
        <p><strong>Subtotal:</strong> {{ formatCurrency(subtotal()) }}</p>
        @if (discountPct() > 0) {
          <p><strong>Descuento:</strong> -{{ discountPct() }}%</p>
        }
        <p style="font-size:20px; font-weight:800;">Total: {{ formatCurrency(total()) }}</p>

        @if (!isGift()) {
          <label class="field">Método de pago</label>
          <div style="display:flex; gap:8px; margin-bottom:14px;">
            <button class="btn" [class.btn-primary]="method() === 'cash'" (click)="method.set('cash')">Efectivo</button>
            <button class="btn" [class.btn-primary]="method() === 'transfer'" (click)="method.set('transfer')">Transferencia</button>
            <button class="btn" [class.btn-primary]="method() === 'card'" (click)="method.set('card')">Tarjeta</button>
          </div>

          @if (method() === 'transfer') {
            <label class="field">
              Referencia
              <input type="text" [(ngModel)]="reference" name="reference" />
            </label>
          }
        }

        @if (errorMessage()) {
          <p class="error-text">{{ errorMessage() }}</p>
        }

        <button class="btn btn-primary" [disabled]="saving()" (click)="confirm()">
          {{ saving() ? 'Guardando…' : isGift() ? 'Confirmar obsequio' : 'Confirmar cobro' }}
        </button>
      </div>
    } @else if (loading()) {
      <p class="hint">Cargando…</p>
    } @else {
      <p class="empty-state">No se encontró la cita.</p>
    }
  `,
})
export class CompleteAppointmentComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  appointment = signal<AppointmentDetail | null>(null);
  progress = signal<LoyaltyProgressRow | null>(null);
  method = signal<PaymentMethod>('cash');
  reference = '';

  formatCurrency = formatCurrency;

  constructor(
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly appointmentsService: AppointmentsService,
    private readonly loyaltyService: LoyaltyService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const ownerId = this.auth.currentUser()?.id;
    if (!id || !ownerId) return;

    const appt = await this.appointmentsService.getAppointmentById(id);
    this.appointment.set(appt);
    if (appt) {
      this.progress.set(await this.loyaltyService.getProgress(ownerId, appt.client_id));
    }
    this.loading.set(false);
  }

  subtotal(): number {
    const appt = this.appointment();
    if (!appt) return 0;
    return appt.services.reduce((sum, s) => sum + s.price_at_time * s.quantity, 0);
  }

  isGift(): boolean {
    const p = this.progress();
    return !!p?.benefit_pending && p.pending_benefit_type === 'gift';
  }

  discountPct(): number {
    const p = this.progress();
    if (p?.benefit_pending && p.pending_benefit_type === 'discount') return p.pending_benefit_value ?? 0;
    return 0;
  }

  total(): number {
    if (this.isGift()) return 0;
    return applyDiscount(this.subtotal(), this.discountPct());
  }

  formatDate(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  }

  async confirm() {
    const appt = this.appointment();
    if (!appt) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      await this.appointmentsService.completeAppointmentAndPay({
        appointmentId: appt.id,
        discountPct: this.discountPct(),
        subtotal: this.subtotal(),
        totalAmount: this.total(),
        paymentMethod: this.method(),
        paymentReference: this.method() === 'transfer' ? this.reference : null,
      });
      await this.router.navigate(['/admin/citas', appt.id]);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo completar la cita.');
    } finally {
      this.saving.set(false);
    }
  }
}
