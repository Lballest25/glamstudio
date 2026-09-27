import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { formatCurrency } from '../core/utils/currency.util';
import { BookingResult, BookingService, PublicService } from './booking.service';

type Step = 'services' | 'slot' | 'contact' | 'confirm' | 'done';

const CATEGORY_LABELS: Record<string, string> = {
  pestañas: 'Pestañas',
  cejas: 'Cejas',
  depilacion: 'Depilación',
  tratamiento: 'Tratamiento',
  otro: 'Otro',
};

@Component({
  selector: 'app-booking-shell',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <header class="header">
        <img src="logo.png" alt="GlamStudio" class="logo" />
        <h1>GlamStudio</h1>
      </header>

      @if (step() !== 'done') {
        <p class="step-indicator">Paso {{ stepNumber() }} de 4</p>
      }

      <div class="wizard-card">
        @switch (step()) {
          @case ('services') {
            <h2>¿Qué servicios quieres agendar?</h2>

            @if (loadingServices()) {
              <p class="hint">Cargando servicios…</p>
            } @else {
              @for (category of categories(); track category) {
                <p class="category-label">{{ categoryLabel(category) }}</p>
                @for (service of servicesByCategory(category); track service.id) {
                  <label class="service-row">
                    <input type="checkbox" [checked]="isSelected(service.id)" (change)="toggleService(service.id)" />
                    <span class="service-name">{{ service.name }}</span>
                    <span class="service-price">{{ formatCurrency(service.base_price) }}</span>
                  </label>
                }
              }

              <div class="subtotal-row">
                <span>Subtotal</span>
                <strong>{{ formatCurrency(subtotal()) }}</strong>
              </div>

              <button class="btn-cta" [disabled]="selectedIds().size === 0" (click)="goToSlotStep()">
                Continuar
              </button>
            }
          }

          @case ('slot') {
            <button class="btn-back" (click)="step.set('services')">&larr; Volver</button>
            <h2>Elige fecha y hora</h2>

            <label class="field">
              Fecha
              <input type="date" [min]="minDate" [(ngModel)]="selectedDate" (ngModelChange)="onDateChange()" />
            </label>

            @if (loadingSlots()) {
              <p class="hint">Buscando horarios disponibles…</p>
            } @else if (slots().length === 0) {
              <p class="empty-state">No hay horarios disponibles ese día. Prueba otra fecha.</p>
            } @else {
              <div class="slot-grid">
                @for (slot of slots(); track slot) {
                  <button
                    class="slot-btn"
                    [class.selected]="selectedSlot() === slot"
                    (click)="selectedSlot.set(slot)"
                  >
                    {{ formatSlotTime(slot) }}
                  </button>
                }
              </div>
            }

            <button class="btn-cta" [disabled]="!selectedSlot()" (click)="step.set('contact')">Continuar</button>
          }

          @case ('contact') {
            <button class="btn-back" (click)="step.set('slot')">&larr; Volver</button>
            <h2>Tus datos</h2>

            <label class="field">
              Nombre completo
              <input type="text" [(ngModel)]="clientName" required />
            </label>
            <label class="field">
              Teléfono (WhatsApp)
              <input type="tel" [(ngModel)]="clientPhone" placeholder="3001234567" (ngModelChange)="onPhoneChange()" required />
            </label>
            <label class="field">
              Email (opcional)
              <input type="email" [(ngModel)]="clientEmail" />
            </label>

            <button class="btn-cta" [disabled]="!canContinueFromContact()" (click)="step.set('confirm')">
              Continuar
            </button>
          }

          @case ('confirm') {
            <button class="btn-back" (click)="step.set('contact')">&larr; Volver</button>
            <h2>Confirma tu cita</h2>

            <div class="summary-block">
              <p><strong>{{ clientName }}</strong> · {{ clientPhone }}</p>
              <p>{{ formatFullDate(selectedSlot()!) }}</p>
              <ul class="summary-list">
                @for (service of selectedServices(); track service.id) {
                  <li>
                    <span>{{ service.name }}</span>
                    <span>{{ formatCurrency(service.base_price) }}</span>
                  </li>
                }
              </ul>
              <div class="subtotal-row">
                <span>Total</span>
                <strong>{{ formatCurrency(subtotal()) }}</strong>
              </div>
            </div>

            @if (hasPendingBenefit()) {
              <div class="benefit-teaser">
                🎁 Tienes descuentos desbloqueados. Acércate 10 minutos antes de tu cita para descubrirlos con más
                detalle.
              </div>
            }

            @if (errorMessage()) {
              <p class="error-text">{{ errorMessage() }}</p>
            }

            <button class="btn-cta" [disabled]="confirming()" (click)="confirmBooking()">
              {{ confirming() ? 'Agendando…' : 'Confirmar cita' }}
            </button>
          }

          @case ('done') {
            <div class="done-block">
              <div class="done-icon">✅</div>
              <h2>¡Tu cita quedó agendada!</h2>
              <p>{{ formatFullDate(bookingResult()!.scheduledAt) }}</p>

              @if (bookingResult()!.hasPendingBenefit) {
                <div class="benefit-teaser">
                  🎁 Tienes descuentos desbloqueados. Acércate 10 minutos antes de tu cita para descubrirlos con más
                  detalle.
                </div>
              }

              <p class="hint">Si necesitas cambiar algo, contáctanos directamente.</p>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        min-height: 100dvh;
        background: var(--color-background);
        padding: 24px 16px 48px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .logo {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        object-fit: cover;
      }
      .header h1 {
        margin: 0;
        font-size: 20px;
      }
      .step-indicator {
        color: var(--color-text-hint);
        font-size: 13px;
        margin-bottom: 16px;
      }
      .wizard-card {
        background: var(--color-surface);
        border-radius: var(--radius-md);
        padding: 20px;
        width: 100%;
        max-width: 420px;
        box-shadow: 0 4px 24px rgba(29, 16, 48, 0.06);
      }
      h2 {
        margin-top: 0;
        font-size: 18px;
      }
      .category-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--color-text-hint);
        margin: 16px 0 6px;
      }
      .service-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        border-bottom: 1px solid var(--color-divider);
        cursor: pointer;
      }
      .service-name {
        flex: 1;
        font-weight: 600;
      }
      .service-price {
        color: var(--color-primary-dark);
        font-weight: 700;
        font-size: 14px;
      }
      .subtotal-row {
        display: flex;
        justify-content: space-between;
        margin: 16px 0;
        font-size: 16px;
      }
      .btn-cta {
        width: 100%;
        border: none;
        border-radius: var(--radius-md);
        background: var(--color-primary);
        color: white;
        font-weight: 800;
        padding: 14px;
        font-size: 16px;
        cursor: pointer;
      }
      .btn-cta:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .btn-back {
        border: none;
        background: transparent;
        color: var(--color-text-secondary);
        font-weight: 700;
        padding: 0;
        margin-bottom: 12px;
        cursor: pointer;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 14px;
        color: var(--color-text-secondary);
        margin-bottom: 16px;
      }
      .field input {
        border: 1px solid var(--color-divider);
        border-radius: var(--radius-md);
        padding: 12px;
        font-size: 15px;
        font-family: inherit;
      }
      .slot-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin: 16px 0;
      }
      .slot-btn {
        border: 1px solid var(--color-divider);
        background: white;
        border-radius: var(--radius-md);
        padding: 10px 4px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }
      .slot-btn.selected {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: white;
      }
      .summary-block {
        background: var(--color-surface-variant);
        border-radius: var(--radius-md);
        padding: 14px;
        margin-bottom: 16px;
      }
      .summary-list {
        list-style: none;
        padding: 0;
        margin: 12px 0 0;
      }
      .summary-list li {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 14px;
      }
      .benefit-teaser {
        background: linear-gradient(135deg, var(--color-loyalty-gold), #ffe680);
        color: var(--color-text-primary);
        border-radius: var(--radius-md);
        padding: 14px;
        font-weight: 700;
        font-size: 14px;
        margin-bottom: 16px;
        text-align: center;
      }
      .done-block {
        text-align: center;
      }
      .done-icon {
        font-size: 40px;
      }
      .hint {
        color: var(--color-text-hint);
        font-size: 14px;
      }
      .empty-state {
        color: var(--color-text-hint);
        text-align: center;
        padding: 16px;
      }
      .error-text {
        color: var(--color-error);
        font-size: 14px;
      }
    `,
  ],
})
export class BookingShellComponent implements OnInit {
  step = signal<Step>('services');

  allServices = signal<PublicService[]>([]);
  loadingServices = signal(true);
  selectedIds = signal<Set<string>>(new Set());

  minDate = new Date().toISOString().slice(0, 10);
  selectedDate = this.minDate;
  slots = signal<string[]>([]);
  loadingSlots = signal(false);
  selectedSlot = signal<string | null>(null);

  clientName = '';
  clientPhone = '';
  clientEmail = '';
  hasPendingBenefit = signal(false);

  confirming = signal(false);
  errorMessage = signal<string | null>(null);
  bookingResult = signal<BookingResult | null>(null);

  formatCurrency = formatCurrency;

  private phoneCheckTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly booking: BookingService) {}

  async ngOnInit() {
    this.allServices.set(await this.booking.listServices());
    this.loadingServices.set(false);
  }

  stepNumber(): number {
    return { services: 1, slot: 2, contact: 3, confirm: 4, done: 4 }[this.step()];
  }

  categories(): string[] {
    return [...new Set(this.allServices().map((s) => s.category))];
  }

  categoryLabel(category: string): string {
    return CATEGORY_LABELS[category] ?? category;
  }

  servicesByCategory(category: string): PublicService[] {
    return this.allServices().filter((s) => s.category === category);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleService(id: string) {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  selectedServices(): PublicService[] {
    const ids = this.selectedIds();
    return this.allServices().filter((s) => ids.has(s.id));
  }

  subtotal(): number {
    return this.selectedServices().reduce((sum, s) => sum + s.base_price, 0);
  }

  async goToSlotStep() {
    this.step.set('slot');
    await this.loadSlots();
  }

  async onDateChange() {
    this.selectedSlot.set(null);
    await this.loadSlots();
  }

  private async loadSlots() {
    this.loadingSlots.set(true);
    this.slots.set(await this.booking.getAvailableSlots(this.selectedDate, [...this.selectedIds()]));
    this.loadingSlots.set(false);
  }

  formatSlotTime(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true }).format(
      new Date(iso)
    );
  }

  formatFullDate(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(iso));
  }

  onPhoneChange() {
    if (this.phoneCheckTimeout) clearTimeout(this.phoneCheckTimeout);
    this.phoneCheckTimeout = setTimeout(async () => {
      const digits = this.clientPhone.replace(/\D/g, '');
      if (digits.length < 7) return;
      this.hasPendingBenefit.set(await this.booking.checkPhoneBenefit(this.clientPhone));
    }, 400);
  }

  canContinueFromContact(): boolean {
    return this.clientName.trim().length > 0 && this.clientPhone.replace(/\D/g, '').length >= 7;
  }

  async confirmBooking() {
    if (!this.selectedSlot()) return;
    this.confirming.set(true);
    this.errorMessage.set(null);
    try {
      const result = await this.booking.createBooking({
        clientName: this.clientName,
        clientPhone: this.clientPhone,
        clientEmail: this.clientEmail || null,
        scheduledAt: this.selectedSlot()!,
        serviceIds: [...this.selectedIds()],
      });
      this.bookingResult.set(result);
      this.step.set('done');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo agendar la cita.');
      if (error instanceof Error && error.message.includes('disponible')) {
        this.step.set('slot');
        await this.loadSlots();
      }
    } finally {
      this.confirming.set(false);
    }
  }
}
