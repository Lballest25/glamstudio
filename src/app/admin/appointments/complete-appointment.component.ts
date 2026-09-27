import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { applyDiscount, formatCurrency } from '../../core/utils/currency.util';
import { formatDayLong, formatTime } from '../../core/utils/format.util';
import { PAYMENT_OPTIONS, PaymentChoice } from '../../core/utils/labels';
import { IconComponent } from '../../shared/components/icon.component';
import { LoyaltyProgressRow, LoyaltyService } from '../loyalty/loyalty.service';
import { AppointmentDetail, AppointmentsService } from './appointments.service';

@Component({
  selector: 'app-complete-appointment',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="page page-narrow fade-in">
      @if (appointment(); as a) {
        <a class="back-link" [routerLink]="['/admin/citas', a.id]">
          <app-icon name="arrow-left" [size]="18" />
          Detalle de la cita
        </a>

        <header>
          <h1>Cobrar cita</h1>
          <p class="page-subtitle">{{ a.client_name }} · {{ formatDayLong(a.scheduled_at) }}, {{ formatTime(a.scheduled_at) }}</p>
        </header>

        @if (isGift()) {
          <section class="benefit">
            <span class="benefit-icon"><app-icon name="gift" [size]="26" /></span>
            <div>
              <p class="benefit-title">Sesión de obsequio</p>
              <p class="benefit-text">{{ a.client_name }} completó su ciclo de fidelización. Esta sesión no tiene costo.</p>
            </div>
          </section>
        } @else if (discountPct() > 0) {
          <section class="benefit">
            <span class="benefit-icon"><app-icon name="percent" [size]="24" /></span>
            <div>
              <p class="benefit-title">{{ discountPct() }}% de descuento de fidelización</p>
              <p class="benefit-text">Se aplica automáticamente en esta cita.</p>
            </div>
          </section>
        }

        <section class="card receipt">
          <ul class="list">
            @for (line of a.services; track line.service_id) {
              <li class="list-row">
                <span class="grow">{{ line.service_name }}@if (line.quantity > 1) { × {{ line.quantity }} }</span>
                <span class="num">{{ formatCurrency(line.price_at_time * line.quantity) }}</span>
              </li>
            }
          </ul>
          <div class="totals">
            @if (discountPct() > 0 || isGift()) {
              <div class="row-between muted"><span>Subtotal</span><span class="num">{{ formatCurrency(subtotal()) }}</span></div>
              <div class="row-between discount">
                <span>{{ isGift() ? 'Obsequio' : 'Descuento ' + discountPct() + '%' }}</span>
                <span class="num">−{{ formatCurrency(subtotal() - total()) }}</span>
              </div>
            }
            <div class="row-between grand">
              <span>Total a cobrar</span>
              <span class="num">{{ formatCurrency(total()) }}</span>
            </div>
          </div>
        </section>

        @if (!isGift()) {
          <section class="card card-pad stack">
            <h2>Método de pago</h2>
            <div class="segmented" role="radiogroup" aria-label="Método de pago">
              @for (option of paymentOptions; track option.value) {
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="method() === option.value"
                  [class.is-active]="method() === option.value"
                  (click)="method.set(option.value)"
                >
                  <app-icon [name]="option.icon" [size]="17" />
                  <span class="opt-label">{{ option.label }}</span>
                </button>
              }
            </div>
            @if (method() === 'transfer') {
              <label class="field">
                <span class="field-label">Referencia <span class="optional">(opcional)</span></span>
                <input class="input" [(ngModel)]="reference" placeholder="Ej. comprobante Nequi" />
              </label>
            }
          </section>
        }

        @if (errorMessage()) {
          <div class="alert alert-danger">
            <app-icon name="alert-circle" [size]="18" />
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <button type="button" class="btn btn-primary btn-lg btn-block" [disabled]="saving()" (click)="confirm(a)">
          @if (saving()) {
            <span class="spinner"></span>
          } @else {
            <app-icon name="check" [size]="20" />
          }
          {{ isGift() ? 'Confirmar obsequio' : 'Confirmar cobro de ' + formatCurrency(total()) }}
        </button>
      } @else if (loading()) {
        <div class="card card-pad stack">
          <span class="skeleton" style="height: 34px; width: 50%"></span>
          <span class="skeleton" style="height: 120px"></span>
        </div>
      } @else {
        <div class="card empty">
          <span class="empty-icon"><app-icon name="receipt" [size]="26" /></span>
          <span class="empty-title">No encontramos esta cita</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .benefit {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 18px;
        border-radius: var(--r-lg);
        background: linear-gradient(135deg, #fff7e0 0%, #fbe9b7 100%);
        border: 1px solid #f1d98f;
        color: #5c4210;
      }
      .benefit-icon {
        width: 52px;
        height: 52px;
        border-radius: var(--r-md);
        display: grid;
        place-items: center;
        background: #fff;
        color: var(--c-gold);
        flex-shrink: 0;
      }
      .benefit-title {
        font-weight: 800;
        font-size: 16px;
        color: #3f2c05;
      }
      .benefit-text {
        font-size: 14px;
        margin-top: 2px;
      }
      .receipt .list-row {
        padding: 12px 20px;
      }
      .totals {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 14px 20px 18px;
        border-top: 1px dashed var(--c-border-strong);
        background: var(--c-surface-2);
      }
      .discount {
        color: var(--c-gold);
        font-weight: 700;
      }
      .grand {
        font-weight: 800;
        font-size: 20px;
      }
      @media (max-width: 420px) {
        .opt-label {
          font-size: 12px;
        }
      }
    `,
  ],
})
export class CompleteAppointmentComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly loyaltyService = inject(LoyaltyService);
  private readonly toast = inject(ToastService);

  readonly paymentOptions = PAYMENT_OPTIONS;

  loading = signal(true);
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  appointment = signal<AppointmentDetail | null>(null);
  progress = signal<LoyaltyProgressRow | null>(null);
  method = signal<PaymentChoice>('cash');
  reference = '';

  subtotal = computed(() =>
    (this.appointment()?.services ?? []).reduce((sum, s) => sum + s.price_at_time * s.quantity, 0)
  );
  isGift = computed(() => {
    const p = this.progress();
    return !!p?.benefit_pending && p.pending_benefit_type === 'gift';
  });
  discountPct = computed(() => {
    const p = this.progress();
    return p?.benefit_pending && p.pending_benefit_type === 'discount' ? (p.pending_benefit_value ?? 0) : 0;
  });
  total = computed(() => (this.isGift() ? 0 : applyDiscount(this.subtotal(), this.discountPct())));

  formatCurrency = formatCurrency;
  formatDayLong = formatDayLong;
  formatTime = formatTime;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const ownerId = this.auth.currentUser()?.id;
    if (!id || !ownerId) return;

    try {
      const appt = await this.appointmentsService.getAppointmentById(id);
      this.appointment.set(appt);
      if (appt) this.progress.set(await this.loyaltyService.getProgress(ownerId, appt.client_id));
    } catch {
      this.toast.error('No se pudo cargar la cita.');
    } finally {
      this.loading.set(false);
    }
  }

  async confirm(a: AppointmentDetail) {
    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      await this.appointmentsService.completeAppointmentAndPay({
        appointmentId: a.id,
        discountPct: this.discountPct(),
        subtotal: this.subtotal(),
        totalAmount: this.total(),
        paymentMethod: this.method(),
        paymentReference: this.method() === 'transfer' ? this.reference.trim() || null : null,
      });
      this.toast.success(this.isGift() ? 'Obsequio registrado' : 'Cobro registrado');
      await this.router.navigate(['/admin/citas', a.id]);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo completar la cita.');
    } finally {
      this.saving.set(false);
    }
  }
}
