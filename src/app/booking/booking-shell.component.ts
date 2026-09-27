import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { formatCurrency } from '../core/utils/currency.util';
import {
  firstName,
  formatDayLong,
  formatDuration,
  formatMonthShort,
  formatTime,
  formatWeekdayShort,
  parseISODate,
  plural,
  relativeDayLabel,
  toLocalISODate,
} from '../core/utils/format.util';
import { CATEGORY_ORDER, categoryMeta } from '../core/utils/labels';
import { IconComponent } from '../shared/components/icon.component';
import { BookingResult, BookingService, PublicService } from './booking.service';

type StepKey = 'services' | 'slot' | 'contact' | 'confirm';

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'services', label: 'Servicios' },
  { key: 'slot', label: 'Horario' },
  { key: 'contact', label: 'Tus datos' },
  { key: 'confirm', label: 'Confirmar' },
];

const DAYS_AHEAD = 21;
const AUTO_PICK_LOOKAHEAD = 10;

interface DayOption {
  key: string;
  weekday: string;
  day: number;
  month: string;
}

interface SlotGroup {
  key: string;
  label: string;
  icon: string;
  slots: string[];
}

function buildDays(): DayOption[] {
  const today = new Date();
  return Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    return {
      key: toLocalISODate(date),
      weekday: i === 0 ? 'Hoy' : formatWeekdayShort(date),
      day: date.getDate(),
      month: formatMonthShort(date),
    };
  });
}

@Component({
  selector: 'app-booking-shell',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './booking-shell.component.html',
  styleUrl: './booking-shell.component.scss',
})
export class BookingShellComponent implements OnInit {
  private readonly booking = inject(BookingService);

  readonly steps = STEPS;
  readonly days = buildDays();

  step = signal<StepKey | 'done'>('services');
  stepIndex = computed(() => {
    const current = this.step();
    return current === 'done' ? STEPS.length : STEPS.findIndex((s) => s.key === current);
  });

  // Step 1 — services
  services = signal<PublicService[]>([]);
  loadingServices = signal(true);
  loadError = signal(false);
  categoryFilter = signal<string>('all');
  selectedIds = signal<Set<string>>(new Set());

  categories = computed(() => CATEGORY_ORDER.filter((c) => this.services().some((s) => s.category === c)));
  groups = computed(() =>
    this.categories()
      .filter((c) => this.categoryFilter() === 'all' || this.categoryFilter() === c)
      .map((category) => ({
        category,
        label: categoryMeta(category).label,
        items: this.services().filter((s) => s.category === category),
      }))
  );
  selectedServices = computed(() => this.services().filter((s) => this.selectedIds().has(s.id)));
  subtotal = computed(() => this.selectedServices().reduce((sum, s) => sum + s.base_price, 0));
  totalDuration = computed(() => this.selectedServices().reduce((sum, s) => sum + s.duration_min, 0));

  // Step 2 — day & time
  selectedDay = signal(this.days[0].key);
  slots = signal<string[]>([]);
  loadingSlots = signal(false);
  selectedSlot = signal<string | null>(null);
  selectedDayLabel = computed(() => relativeDayLabel(parseISODate(this.selectedDay())));
  slotGroups = computed<SlotGroup[]>(() => {
    const groups: SlotGroup[] = [
      { key: 'morning', label: 'Mañana', icon: 'sunrise', slots: [] },
      { key: 'afternoon', label: 'Tarde', icon: 'sun', slots: [] },
      { key: 'evening', label: 'Noche', icon: 'moon', slots: [] },
    ];
    for (const slot of this.slots()) {
      const hour = new Date(slot).getHours();
      groups[hour < 12 ? 0 : hour < 17 ? 1 : 2].slots.push(slot);
    }
    return groups.filter((g) => g.slots.length > 0);
  });
  private slotRequest = 0;
  private slotsSignature = '';

  // Step 3 — contact
  name = '';
  phone = '';
  email = '';
  phoneTouched = signal(false);
  hasPendingBenefit = signal(false);
  private phoneCheckTimeout: ReturnType<typeof setTimeout> | null = null;

  // Step 4 — confirm
  confirming = signal(false);
  errorMessage = signal<string | null>(null);
  result = signal<BookingResult | null>(null);

  meta = categoryMeta;
  formatCurrency = formatCurrency;
  formatDuration = formatDuration;
  formatTime = formatTime;
  formatDayLong = formatDayLong;
  plural = plural;

  async ngOnInit() {
    await this.loadServices();
  }

  async loadServices() {
    this.loadingServices.set(true);
    this.loadError.set(false);
    try {
      this.services.set(await this.booking.listServices());
    } catch {
      this.loadError.set(true);
    } finally {
      this.loadingServices.set(false);
    }
  }

  // --- navigation ---------------------------------------------------------

  private setStep(step: StepKey | 'done') {
    this.step.set(step);
    this.errorMessage.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goTo(step: StepKey) {
    const target = STEPS.findIndex((s) => s.key === step);
    if (target < this.stepIndex()) this.setStep(step);
  }

  canContinue(): boolean {
    switch (this.step()) {
      case 'services':
        return this.selectedIds().size > 0;
      case 'slot':
        return !!this.selectedSlot();
      case 'contact':
        return this.contactValid();
      default:
        return false;
    }
  }

  async next() {
    if (!this.canContinue()) {
      if (this.step() === 'contact') this.phoneTouched.set(true);
      return;
    }
    switch (this.step()) {
      case 'services':
        await this.enterSlotStep();
        break;
      case 'slot':
        this.setStep('contact');
        break;
      case 'contact':
        this.setStep('confirm');
        break;
    }
  }

  // --- services -----------------------------------------------------------

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleService(id: string) {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  // --- slots --------------------------------------------------------------

  private async enterSlotStep() {
    this.setStep('slot');
    const signature = [...this.selectedIds()].sort().join(',');
    if (signature === this.slotsSignature) return;
    this.slotsSignature = signature;
    this.selectedSlot.set(null);
    await this.autoPickFirstAvailableDay();
  }

  // Jumps to the first day (within the lookahead) that has any availability,
  // so a client opening the link at night doesn't land on an empty "today".
  private async autoPickFirstAvailableDay() {
    const token = ++this.slotRequest;
    this.loadingSlots.set(true);
    const ids = [...this.selectedIds()];
    try {
      for (let i = 0; i < AUTO_PICK_LOOKAHEAD; i++) {
        const key = this.days[i].key;
        const slots = await this.booking.getAvailableSlots(key, ids);
        if (token !== this.slotRequest) return;
        if (slots.length > 0 || i === AUTO_PICK_LOOKAHEAD - 1) {
          this.selectedDay.set(slots.length > 0 ? key : this.days[0].key);
          this.slots.set(slots.length > 0 ? slots : []);
          this.scrollSelectedDayIntoView();
          break;
        }
      }
    } catch {
      if (token === this.slotRequest) this.errorMessage.set('No pudimos cargar los horarios. Intenta de nuevo.');
    } finally {
      if (token === this.slotRequest) this.loadingSlots.set(false);
    }
  }

  async selectDay(key: string) {
    if (key === this.selectedDay() && !this.loadingSlots()) return;
    this.selectedDay.set(key);
    this.selectedSlot.set(null);
    await this.loadSlots(key);
  }

  private async loadSlots(key: string) {
    const token = ++this.slotRequest;
    this.loadingSlots.set(true);
    try {
      const slots = await this.booking.getAvailableSlots(key, [...this.selectedIds()]);
      if (token === this.slotRequest) this.slots.set(slots);
    } catch {
      if (token === this.slotRequest) this.errorMessage.set('No pudimos cargar los horarios. Intenta de nuevo.');
    } finally {
      if (token === this.slotRequest) this.loadingSlots.set(false);
    }
  }

  private scrollSelectedDayIntoView() {
    setTimeout(() => {
      document.querySelector('.day.is-active')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 60);
  }

  // --- contact ------------------------------------------------------------

  phoneDigits(): number {
    return this.phone.replace(/\D/g, '').length;
  }

  phoneValid(): boolean {
    const digits = this.phoneDigits();
    return digits >= 7 && digits <= 15;
  }

  contactValid(): boolean {
    return this.name.trim().length >= 2 && this.phoneValid();
  }

  onPhoneChange() {
    if (this.phoneCheckTimeout) clearTimeout(this.phoneCheckTimeout);
    this.hasPendingBenefit.set(false);
    if (!this.phoneValid()) return;
    this.phoneCheckTimeout = setTimeout(async () => {
      try {
        this.hasPendingBenefit.set(await this.booking.checkPhoneBenefit(this.phone.trim()));
      } catch {
        this.hasPendingBenefit.set(false);
      }
    }, 450);
  }

  // --- confirm ------------------------------------------------------------

  async confirmBooking() {
    const slot = this.selectedSlot();
    if (!slot || this.confirming()) return;

    this.confirming.set(true);
    this.errorMessage.set(null);
    try {
      const result = await this.booking.createBooking({
        clientName: this.name.trim(),
        clientPhone: this.phone.trim(),
        clientEmail: this.email.trim() || null,
        scheduledAt: slot,
        serviceIds: [...this.selectedIds()],
      });
      this.result.set(result);
      this.setStep('done');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo agendar la cita.';
      if (message.includes('disponible')) {
        this.setStep('slot');
        this.selectedSlot.set(null);
        await this.loadSlots(this.selectedDay());
      }
      this.errorMessage.set(message);
    } finally {
      this.confirming.set(false);
    }
  }

  reset() {
    this.selectedIds.set(new Set());
    this.selectedSlot.set(null);
    this.slots.set([]);
    this.slotsSignature = '';
    this.selectedDay.set(this.days[0].key);
    this.result.set(null);
    this.hasPendingBenefit.set(false);
    this.categoryFilter.set('all');
    this.setStep('services');
  }

  // --- bottom bar ---------------------------------------------------------

  barMain(): string {
    if (this.step() === 'slot') {
      const slot = this.selectedSlot();
      return slot ? formatTime(slot) : 'Elige una hora';
    }
    return formatCurrency(this.subtotal());
  }

  barSub(): string {
    const count = this.selectedIds().size;
    if (this.step() === 'services') {
      return count === 0 ? 'Elige al menos un servicio' : `${plural(count, 'servicio')} · ${formatDuration(this.totalDuration())}`;
    }
    if (this.step() === 'slot') return this.selectedDayLabel();
    const slot = this.selectedSlot();
    return slot ? `${this.selectedDayLabel()} · ${formatTime(slot)}` : '';
  }

  greetingName(): string {
    return firstName(this.name);
  }

  calendarLink(): string {
    const r = this.result();
    if (!r) return '#';
    const start = new Date(r.scheduledAt);
    const end = new Date(start.getTime() + (this.totalDuration() || 60) * 60_000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const details = this.selectedServices()
      .map((s) => `• ${s.name}`)
      .join('\n');
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Cita en GlamStudio',
      dates: `${fmt(start)}/${fmt(end)}`,
      details: `${details}\n\nTe esperamos 💅`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
}
