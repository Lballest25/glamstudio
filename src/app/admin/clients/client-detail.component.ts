import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { formatCurrency } from '../../core/utils/currency.util';
import {
  avatarColors,
  formatDateMedium,
  formatDayMonth,
  initials,
  parseISODate,
} from '../../core/utils/format.util';
import { buildChatUri } from '../../core/utils/whatsapp.util';
import { IconComponent } from '../../shared/components/icon.component';
import { AppointmentsService, ClientAppointment } from '../appointments/appointments.service';
import { LoyaltyRuleRow, LoyaltyService } from '../loyalty/loyalty.service';
import { ClientRow, ClientsService, LoyaltyProgressRow } from './clients.service';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page page-narrow fade-in">
      <a class="back-link" routerLink="/admin/clientas">
        <app-icon name="arrow-left" [size]="18" />
        Clientas
      </a>

      @if (client(); as c) {
        <section class="card card-pad profile">
          <span class="avatar avatar-xl" [style.background]="avatar().bg" [style.color]="avatar().fg">{{
            initialsText()
          }}</span>
          <div class="profile-main">
            <h1>{{ c.full_name }}</h1>
            <div class="profile-meta">
              @if (c.phone) {
                <span><app-icon name="phone" [size]="15" /> {{ c.phone }}</span>
              }
              @if (c.email) {
                <span><app-icon name="mail" [size]="15" /> {{ c.email }}</span>
              }
              @if (c.birth_date) {
                <span><app-icon name="cake" [size]="15" /> {{ birthday(c.birth_date) }}</span>
              }
            </div>
          </div>
          <div class="profile-actions">
            <a class="btn btn-primary" routerLink="/admin/citas/nueva" [queryParams]="{ clientId: c.id }">
              <app-icon name="calendar-plus" [size]="18" />
              Agendar cita
            </a>
            @if (c.phone) {
              <a class="btn btn-whatsapp" [href]="chatLink(c.phone)" target="_blank" rel="noopener">
                <app-icon name="message-circle" [size]="18" />
                WhatsApp
              </a>
            }
            <a class="btn btn-ghost" [routerLink]="['/admin/clientas', c.id, 'editar']">
              <app-icon name="pencil" [size]="17" />
              Editar
            </a>
          </div>
        </section>

        <section class="grid grid-stats">
          <div class="card stat">
            <span class="stat-label">Sesiones</span>
            <span class="stat-value">{{ history().length }}</span>
          </div>
          <div class="card stat">
            <span class="stat-label">Total invertido</span>
            <span class="stat-value">{{ formatCurrency(totalSpent()) }}</span>
          </div>
          <div class="card stat">
            <span class="stat-label">Última visita</span>
            <span class="stat-value small-value">{{ lastVisit() }}</span>
          </div>
        </section>

        <a class="card card-pad card-link loyalty" [routerLink]="['/admin/clientas', c.id, 'fidelizacion']">
          <div class="row">
            <span class="tile tone-gold"><app-icon name="crown" [size]="20" /></span>
            <div class="grow">
              <h3>Fidelización</h3>
              <p class="muted small">{{ loyaltySummary() }}</p>
            </div>
            <app-icon name="chevron-right" [size]="18" class="chev" />
          </div>
          @if (progressPct() !== null) {
            <div class="progress" style="margin-top: 14px"><span [style.width.%]="progressPct()"></span></div>
          }
        </a>

        <section class="card">
          <div class="card-head">
            <h2>Historial</h2>
            @if (history().length > 5) {
              <a class="link-sm" [routerLink]="['/admin/clientas', c.id, 'historial']">
                Ver todo
                <app-icon name="chevron-right" [size]="16" />
              </a>
            }
          </div>
          @if (history().length === 0) {
            <p class="section-empty">Aún no tiene sesiones completadas.</p>
          } @else {
            <ul class="list">
              @for (appt of history().slice(0, 5); track appt.id) {
                <li>
                  <a class="list-row" [routerLink]="['/admin/citas', appt.id]">
                    <span class="grow">
                      <span class="list-title" style="display: block">{{ formatDateMedium(appt.scheduled_at) }}</span>
                      <span class="list-sub truncate" style="display: block">{{
                        appt.service_names.join(' · ') || 'Sesión #' + (appt.session_number ?? '')
                      }}</span>
                    </span>
                    @if (appt.is_benefit_session) {
                      <span class="badge badge-gold"><app-icon name="gift" [size]="13" /> Beneficio</span>
                    }
                    <span class="strong num">{{ formatCurrency(appt.total_amount ?? 0) }}</span>
                  </a>
                </li>
              }
            </ul>
          }
        </section>

        @if (c.notes) {
          <section class="card card-pad">
            <h3>Notas</h3>
            <p class="muted notes">{{ c.notes }}</p>
          </section>
        }
      } @else if (loading()) {
        <div class="card card-pad profile">
          <span class="skeleton" style="width: 76px; height: 76px; border-radius: 50%"></span>
          <div class="grow stack" style="gap: 10px">
            <span class="skeleton" style="height: 26px; width: 55%"></span>
            <span class="skeleton" style="height: 14px; width: 35%"></span>
          </div>
        </div>
      } @else {
        <div class="card empty">
          <span class="empty-icon"><app-icon name="user" [size]="26" /></span>
          <span class="empty-title">No encontramos esta clienta</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .profile {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
      }
      .profile-main {
        flex: 1;
        min-width: 220px;
      }
      .profile-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 16px;
        margin-top: 8px;
        color: var(--c-text-2);
        font-size: 14px;
      }
      .profile-meta span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .profile-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        width: 100%;
      }
      .small-value {
        font-size: 18px;
      }
      .section-empty {
        padding: 4px 20px 20px;
        color: var(--c-text-3);
        font-size: 14px;
      }
      .notes {
        margin-top: 6px;
        white-space: pre-line;
      }
      @media (max-width: 599px) {
        .profile-actions .btn {
          flex: 1;
        }
      }
    `,
  ],
})
export class ClientDetailComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly clientsService = inject(ClientsService);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly loyaltyService = inject(LoyaltyService);

  loading = signal(true);
  client = signal<ClientRow | null>(null);
  history = signal<ClientAppointment[]>([]);
  progress = signal<LoyaltyProgressRow | null>(null);
  rules = signal<LoyaltyRuleRow[]>([]);

  avatar = computed(() => avatarColors(this.client()?.full_name ?? ''));
  initialsText = computed(() => initials(this.client()?.full_name ?? ''));
  totalSpent = computed(() => this.history().reduce((sum, a) => sum + (a.total_amount ?? 0), 0));
  lastVisit = computed(() => {
    const last = this.history()[0];
    return last ? formatDateMedium(last.scheduled_at) : '—';
  });
  currentRule = computed(() => {
    const p = this.progress();
    return p ? this.rules().find((r) => r.stage_order === p.current_stage_order) : undefined;
  });
  progressPct = computed(() => {
    const p = this.progress();
    const rule = this.currentRule();
    if (!p) return null;
    if (p.benefit_pending) return 100;
    if (!rule) return null;
    return Math.min(100, (p.stage_sessions / rule.sessions_required) * 100);
  });
  loyaltySummary = computed(() => {
    const p = this.progress();
    if (!p) return 'Aún sin sesiones completadas.';
    if (p.benefit_pending) {
      return p.pending_benefit_type === 'gift'
        ? 'Obsequio listo para su próxima cita.'
        : `${p.pending_benefit_value}% de descuento listo para su próxima cita.`;
    }
    const rule = this.currentRule();
    return rule
      ? `${p.stage_sessions} de ${rule.sessions_required} sesiones · Etapa ${p.current_stage_order}`
      : `${p.total_sessions} sesiones en total`;
  });

  formatCurrency = formatCurrency;
  formatDateMedium = formatDateMedium;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const ownerId = this.auth.currentUser()?.id;
    if (!id || !ownerId) return;

    const [client, history, progress, rules] = await Promise.all([
      this.clientsService.getClientById(id),
      this.appointmentsService.getClientAppointments(id),
      this.loyaltyService.getProgress(ownerId, id),
      this.loyaltyService.getRules(ownerId),
    ]);
    this.client.set(client);
    this.history.set(history);
    this.progress.set(progress);
    this.rules.set(rules);
    this.loading.set(false);
  }

  birthday(value: string): string {
    return formatDayMonth(parseISODate(value));
  }

  chatLink(phone: string): string {
    return buildChatUri(phone);
  }
}
