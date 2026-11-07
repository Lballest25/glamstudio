import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { bookingUrl } from '../../core/utils/booking-link';
import { avatarColors, formatDateMedium, initials, plural } from '../../core/utils/format.util';
import { buildComeBackUri } from '../../core/utils/whatsapp.util';
import { IconComponent } from '../../shared/components/icon.component';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { OverdueClient, RecontactService } from './recontact.service';

const OPTIONS = [
  { days: 21, label: '3 semanas' },
  { days: 30, label: '1 mes' },
  { days: 60, label: '2 meses' },
  { days: 90, label: '3 meses' },
];
const STORAGE_KEY = 'glam.recontact.days';

@Component({
  selector: 'app-returning-clients',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page page-narrow fade-in">
      <a class="back-link" routerLink="/admin/clientas">
        <app-icon name="arrow-left" [size]="18" />
        Clientas
      </a>

      <header>
        <h1>Les toca volver</h1>
        <p class="page-subtitle">
          Clientas que no vienen hace un tiempo y no tienen cita agendada. Un mensaje a tiempo las trae de vuelta.
        </p>
      </header>

      <div class="field">
        <span class="field-label">Sin venir hace más de…</span>
        <div class="chips">
          @for (o of options; track o.days) {
            <button type="button" class="chip" [class.is-active]="days() === o.days" (click)="setDays(o.days)">
              {{ o.label }}
            </button>
          }
        </div>
      </div>

      <section class="card">
        @if (loading()) {
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="skeleton-row">
              <span class="skeleton" style="width: 44px; height: 44px; border-radius: 50%"></span>
              <span class="grow stack" style="gap: 6px">
                <span class="skeleton" style="height: 14px; width: 45%"></span>
                <span class="skeleton" style="height: 12px; width: 30%"></span>
              </span>
            </div>
          }
        } @else if (items().length === 0) {
          <div class="empty">
            <span class="empty-icon"><app-icon name="check-circle" [size]="26" /></span>
            <span class="empty-title">¡Todas al día!</span>
            <span>Ninguna clienta lleva más de {{ currentLabel() }} sin venir.</span>
          </div>
        } @else {
          <div class="count-row">{{ plural(items().length, 'clienta', 'clientas') }}</div>
          <ul class="list">
            @for (item of items(); track item.client.id) {
              <li class="list-row">
                <span
                  class="avatar"
                  [style.background]="avatar(item.client.full_name).bg"
                  [style.color]="avatar(item.client.full_name).fg"
                  >{{ initials(item.client.full_name) }}</span
                >
                <a class="grow who" [routerLink]="['/admin/clientas', item.client.id]">
                  <span class="list-title truncate" style="display: block">{{ item.client.full_name }}</span>
                  <span class="list-sub" style="display: block">
                    Última visita hace {{ item.daysSince }} días · {{ plural(item.visits, 'visita') }}
                  </span>
                  @if (item.lastContactedAt) {
                    <span class="badge badge-info" style="margin-top: 6px">
                      Escrita el {{ formatDateMedium(item.lastContactedAt) }}
                    </span>
                  }
                </a>
                @if (item.client.phone) {
                  <a
                    class="btn btn-whatsapp btn-sm"
                    [href]="link(item)"
                    target="_blank"
                    rel="noopener"
                    (click)="markContacted(item)"
                  >
                    <app-icon name="message-circle" [size]="16" />
                    {{ item.lastContactedAt ? 'Escribir otra vez' : 'Escribir' }}
                  </a>
                } @else {
                  <span class="subtle small">Sin celular</span>
                }
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `,
  styles: [
    `
      .count-row {
        padding: 14px 20px 6px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--c-text-3);
      }
      .who {
        color: inherit;
        min-width: 0;
      }
    `,
  ],
})
export class ReturningClientsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly recontact = inject(RecontactService);
  private readonly loyalty = inject(LoyaltyService);
  private readonly toast = inject(ToastService);

  readonly options = OPTIONS;
  days = signal(this.storedDays());
  loading = signal(true);
  items = signal<OverdueClient[]>([]);

  avatar = avatarColors;
  initials = initials;
  plural = plural;
  formatDateMedium = formatDateMedium;

  private ownerId: string | null = null;
  private request = 0;

  async ngOnInit() {
    this.ownerId = this.auth.currentUser()?.id ?? null;
    await this.reload();
  }

  currentLabel(): string {
    return (OPTIONS.find((o) => o.days === this.days())?.label ?? '').toLowerCase();
  }

  async setDays(days: number) {
    this.days.set(days);
    try {
      localStorage.setItem(STORAGE_KEY, String(days));
    } catch {
      /* private mode: the choice just isn't remembered */
    }
    await this.reload();
  }

  link(item: OverdueClient): string {
    return buildComeBackUri(item.client.phone ?? '', item.client.full_name, bookingUrl());
  }

  // Logged so the list can show "Escrita el …" and the owner doesn't message
  // the same person twice by accident.
  async markContacted(item: OverdueClient) {
    if (!this.ownerId || !item.client.phone) return;
    const now = new Date();
    this.items.update((list) =>
      list.map((i) => (i.client.id === item.client.id ? { ...i, lastContactedAt: now } : i))
    );
    try {
      await this.loyalty.logWhatsAppMessage(
        this.ownerId,
        item.client.id,
        item.client.phone,
        'manual',
        this.link(item)
      );
    } catch {
      this.toast.error('El mensaje se abrió, pero no se pudo registrar el envío.');
    }
  }

  private storedDays(): number {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY));
      if (OPTIONS.some((o) => o.days === saved)) return saved;
    } catch {
      /* ignore */
    }
    return 21;
  }

  private async reload() {
    if (!this.ownerId) return;
    const token = ++this.request;
    this.loading.set(true);
    try {
      const result = await this.recontact.getOverdue(this.ownerId, this.days());
      if (token === this.request) this.items.set(result);
    } catch {
      this.toast.error('No se pudo cargar la lista.');
    } finally {
      if (token === this.request) this.loading.set(false);
    }
  }
}
