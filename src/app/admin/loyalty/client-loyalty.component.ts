import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { plural } from '../../core/utils/format.util';
import { AlertType, buildAlertUri } from '../../core/utils/whatsapp.util';
import { IconComponent } from '../../shared/components/icon.component';
import { ClientRow, ClientsService } from '../clients/clients.service';
import { LoyaltyProgressRow, LoyaltyRuleRow, LoyaltyService } from './loyalty.service';

@Component({
  selector: 'app-client-loyalty',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page page-narrow fade-in">
      <a class="back-link" [routerLink]="['/admin/clientas', clientId]">
        <app-icon name="arrow-left" [size]="18" />
        Perfil
      </a>

      <header>
        <h1>Fidelización</h1>
        <p class="page-subtitle">{{ client()?.full_name }}</p>
      </header>

      @if (loading()) {
        <div class="skeleton" style="height: 200px; border-radius: 28px"></div>
      } @else if (!progress()) {
        <div class="card empty">
          <span class="empty-icon"><app-icon name="crown" [size]="26" /></span>
          <span class="empty-title">Aún sin sesiones completadas</span>
          <span>Su progreso empieza a contar cuando completes su primera cita.</span>
        </div>
      } @else {
        <section class="hero">
          @if (progress()!.benefit_pending) {
            <span class="hero-icon"><app-icon [name]="progress()!.pending_benefit_type === 'gift' ? 'gift' : 'percent'" [size]="28" /></span>
            <p class="hero-eyebrow">¡Beneficio listo!</p>
            <h2 class="hero-title">
              {{ progress()!.pending_benefit_type === 'gift' ? 'Obsequio' : progress()!.pending_benefit_value + '% de descuento' }}
            </h2>
            <p class="hero-text">Se aplica automáticamente al completar su próxima cita.</p>
          } @else {
            <p class="hero-eyebrow">Etapa {{ progress()!.current_stage_order }} de {{ rules().length }}</p>
            <h2 class="hero-title">
              {{ progress()!.stage_sessions }} <span class="of">de {{ currentRule()?.sessions_required ?? '—' }} sesiones</span>
            </h2>
            <div class="hero-progress"><span [style.width.%]="progressPct()"></span></div>
            <p class="hero-text">
              @if (sessionsLeft() > 0) {
                {{ sessionsLeft() === 1 ? 'Falta 1 sesión' : 'Faltan ' + sessionsLeft() + ' sesiones' }} para:
                <strong>{{ currentRule()?.description }}</strong>
              }
            </p>
          }
        </section>

        <section class="grid grid-stats">
          <div class="card stat">
            <span class="stat-label">Sesiones totales</span>
            <span class="stat-value">{{ progress()!.total_sessions }}</span>
          </div>
          <div class="card stat">
            <span class="stat-label">Etapa actual</span>
            <span class="stat-value">{{ progress()!.current_stage_order }}</span>
          </div>
        </section>

        @if ((progress()!.alert_pending || progress()!.benefit_pending) && client()?.phone) {
          <section class="card card-pad notify">
            <span class="tile tone-success"><app-icon name="message-circle" [size]="20" /></span>
            <div class="grow">
              <h3>Avísale por WhatsApp</h3>
              <p class="muted small">
                {{ progress()!.benefit_pending ? 'Cuéntale que ya desbloqueó su beneficio.' : 'Le falta 1 sesión para su próximo beneficio.' }}
              </p>
            </div>
            <a class="btn btn-whatsapp" [href]="whatsappLink()" target="_blank" rel="noopener" (click)="onWhatsAppClick()">
              Enviar
            </a>
          </section>
        }

        <section class="card">
          <div class="card-head"><h2>Ciclo de beneficios</h2></div>
          <ol class="timeline">
            @for (rule of rules(); track rule.id) {
              <li [class.done]="rule.stage_order < progress()!.current_stage_order" [class.current]="rule.stage_order === progress()!.current_stage_order">
                <span class="node">
                  @if (rule.stage_order < progress()!.current_stage_order) {
                    <app-icon name="check" [size]="14" [stroke]="3" />
                  } @else {
                    <span>{{ rule.stage_order }}</span>
                  }
                </span>
                <div class="grow">
                  <p class="strong">{{ rule.description }}</p>
                  <p class="subtle small">
                    {{ plural(rule.sessions_required, 'sesión', 'sesiones') }} ·
                    {{ rule.benefit_type === 'gift' ? 'Obsequio' : rule.benefit_value + '% de descuento' }}
                  </p>
                </div>
                @if (rule.stage_order === progress()!.current_stage_order) {
                  <span class="badge badge-primary">Actual</span>
                }
              </li>
            }
          </ol>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .hero {
        position: relative;
        overflow: hidden;
        padding: 28px 24px;
        border-radius: var(--r-xl);
        color: #fff;
        background:
          radial-gradient(90% 80% at 100% 0%, rgba(233, 196, 106, 0.35), transparent 60%),
          linear-gradient(140deg, #3d2656 0%, #6a4793 60%, #9c7bb8 100%);
        box-shadow: var(--sh-md);
      }
      .hero-icon {
        width: 52px;
        height: 52px;
        border-radius: var(--r-md);
        display: grid;
        place-items: center;
        background: rgba(255, 255, 255, 0.16);
        margin-bottom: 14px;
      }
      .hero-eyebrow {
        font-size: 12.5px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.8;
      }
      .hero-title {
        font-family: var(--f-display);
        font-weight: 600;
        font-size: 34px;
        color: #fff;
        margin: 4px 0 12px;
      }
      .hero-title .of {
        font-family: var(--f-sans);
        font-size: 16px;
        font-weight: 600;
        opacity: 0.8;
      }
      .hero-progress {
        height: 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.18);
        overflow: hidden;
        margin-bottom: 14px;
      }
      .hero-progress span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #f6dc8f, #e9c46a);
        transition: width 0.5s ease;
      }
      .hero-text {
        font-size: 14.5px;
        opacity: 0.92;
      }
      .notify {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
      }
      .timeline {
        list-style: none;
        margin: 0;
        padding: 6px 20px 20px;
      }
      .timeline li {
        position: relative;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 0;
      }
      .timeline li + li::before {
        content: '';
        position: absolute;
        left: 15px;
        top: -18px;
        height: 36px;
        width: 2px;
        background: var(--c-border-strong);
      }
      .timeline li.done + li::before {
        background: var(--c-primary);
      }
      .node {
        position: relative;
        z-index: 1;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        font-size: 13px;
        font-weight: 800;
        border: 2px solid var(--c-border-strong);
        color: var(--c-text-3);
        background: var(--c-surface);
      }
      .done .node {
        background: var(--c-primary);
        border-color: var(--c-primary);
        color: #fff;
      }
      .current .node {
        border-color: var(--c-primary);
        color: var(--c-primary);
        box-shadow: 0 0 0 4px var(--c-primary-soft);
      }
    `,
  ],
})
export class ClientLoyaltyComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly clientsService = inject(ClientsService);
  private readonly loyaltyService = inject(LoyaltyService);
  private readonly toast = inject(ToastService);

  clientId = this.route.snapshot.paramMap.get('id');
  loading = signal(true);
  client = signal<ClientRow | null>(null);
  progress = signal<LoyaltyProgressRow | null>(null);
  rules = signal<LoyaltyRuleRow[]>([]);

  currentRule = computed(() => {
    const p = this.progress();
    return p ? this.rules().find((r) => r.stage_order === p.current_stage_order) : undefined;
  });
  progressPct = computed(() => {
    const p = this.progress();
    const rule = this.currentRule();
    if (!p || !rule) return 0;
    return Math.min(100, (p.stage_sessions / rule.sessions_required) * 100);
  });
  sessionsLeft = computed(() => {
    const p = this.progress();
    const rule = this.currentRule();
    if (!p || !rule) return 0;
    return Math.max(0, rule.sessions_required - p.stage_sessions);
  });

  plural = plural;

  private ownerId: string | null = null;

  async ngOnInit() {
    this.ownerId = this.auth.currentUser()?.id ?? null;
    if (!this.ownerId || !this.clientId) return;

    const [client, progress, rules] = await Promise.all([
      this.clientsService.getClientById(this.clientId),
      this.loyaltyService.getProgress(this.ownerId, this.clientId),
      this.loyaltyService.getRules(this.ownerId),
    ]);
    this.client.set(client);
    this.progress.set(progress);
    this.rules.set(rules);
    this.loading.set(false);
  }

  private resolveAlertType(): AlertType {
    const progress = this.progress()!;
    if (progress.benefit_pending) {
      if (progress.pending_benefit_type === 'gift') return 'unlocked_gift';
      return progress.pending_benefit_value === 20 ? 'unlocked_20' : 'unlocked_10';
    }
    const rule = this.currentRule();
    if (rule?.benefit_type === 'gift') return 'to_gift';
    return rule?.benefit_value === 20 ? 'to_20' : 'to_10';
  }

  whatsappLink(): string {
    const client = this.client()!;
    return buildAlertUri(client.phone ?? '', client.full_name, this.resolveAlertType());
  }

  async onWhatsAppClick() {
    const client = this.client();
    const progress = this.progress();
    if (!this.ownerId || !client?.phone || !progress) return;

    try {
      await this.loyaltyService.logWhatsAppMessage(
        this.ownerId,
        client.id,
        client.phone,
        progress.benefit_pending ? 'benefit_unlocked' : 'loyalty_alert',
        this.whatsappLink()
      );
      if (progress.alert_pending) {
        await this.loyaltyService.clearAlert(this.ownerId, client.id);
        this.progress.set({ ...progress, alert_pending: false });
      }
    } catch {
      this.toast.error('El mensaje se abrió, pero no se pudo registrar el envío.');
    }
  }
}
