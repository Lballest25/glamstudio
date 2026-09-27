import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlertType, buildAlertUri } from '../../core/utils/whatsapp.util';
import { ClientRow, ClientsService } from '../clients/clients.service';
import { LoyaltyProgressRow, LoyaltyRuleRow, LoyaltyService } from './loyalty.service';

@Component({
  selector: 'app-client-loyalty',
  standalone: true,
  template: `
    <h1>Fidelización</h1>

    @if (loading()) {
      <p class="hint">Cargando…</p>
    } @else if (!client()) {
      <p class="empty-state">No se encontró la clienta.</p>
    } @else if (!progress()) {
      <p class="empty-state">{{ client()!.full_name }} aún no tiene sesiones completadas.</p>
    } @else {
      <div class="card" style="max-width: 480px; margin-bottom:20px; text-align:center;">
        <h2 style="margin-top:0;">{{ client()!.full_name }}</h2>

        @if (progress()!.benefit_pending) {
          <p class="badge badge-gold" style="font-size:16px; padding:8px 16px;">
            {{ progress()!.pending_benefit_type === 'gift' ? '¡Obsequio listo! 🎁' : '¡' + progress()!.pending_benefit_value + '% descuento listo!' }}
          </p>
        } @else {
          @if (currentRule(); as rule) {
            <p class="hint">{{ progress()!.stage_sessions }} de {{ rule.sessions_required }} sesiones</p>
            <div style="background: var(--color-surface-variant); border-radius: 999px; height:10px; overflow:hidden; margin: 8px 0 12px;">
              <div
                style="height:100%; background: var(--color-primary);"
                [style.width.%]="(progress()!.stage_sessions / rule.sessions_required) * 100"
              ></div>
            </div>
            <p class="hint">Próximo beneficio: {{ rule.description }}</p>
          }
        }

        <div style="display:flex; justify-content:center; gap:24px; margin-top:16px;">
          <div>
            <div style="font-size:22px; font-weight:800; color: var(--color-primary-dark);">
              {{ progress()!.total_sessions }}
            </div>
            <div class="hint">Sesiones totales</div>
          </div>
          <div>
            <div style="font-size:22px; font-weight:800; color: var(--color-primary-dark);">
              {{ progress()!.current_stage_order }}
            </div>
            <div class="hint">Etapa actual</div>
          </div>
        </div>
      </div>

      <h3>Ciclo de fidelización</h3>
      <ul class="list" style="margin-bottom:20px;">
        @for (rule of rules(); track rule.id) {
          <li class="list-item">
            <span
              class="badge"
              [class.badge-success]="rule.stage_order < progress()!.current_stage_order"
              [class.badge-gold]="rule.stage_order === progress()!.current_stage_order"
            >
              Etapa {{ rule.stage_order }}
            </span>
            <span style="flex:1;">{{ rule.description }}</span>
            @if (rule.stage_order === progress()!.current_stage_order && !progress()!.benefit_pending) {
              <span class="hint">{{ progress()!.stage_sessions }}/{{ rule.sessions_required }}</span>
            }
          </li>
        }
      </ul>

      @if ((progress()!.alert_pending || progress()!.benefit_pending) && client()!.phone) {
        <a class="btn" style="background: var(--color-whatsapp); color:white;" [href]="whatsappLink()" target="_blank" rel="noopener" (click)="onWhatsAppClick()">
          Enviar mensaje de WhatsApp
        </a>
      }
    }
  `,
})
export class ClientLoyaltyComponent implements OnInit {
  loading = signal(true);
  client = signal<ClientRow | null>(null);
  progress = signal<LoyaltyProgressRow | null>(null);
  rules = signal<LoyaltyRuleRow[]>([]);

  private ownerId: string | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly clientsService: ClientsService,
    private readonly loyaltyService: LoyaltyService
  ) {}

  async ngOnInit() {
    this.ownerId = this.auth.currentUser()?.id ?? null;
    const clientId = this.route.snapshot.paramMap.get('id');
    if (!this.ownerId || !clientId) return;

    const [client, progress, rules] = await Promise.all([
      this.clientsService.getClientById(clientId),
      this.loyaltyService.getProgress(this.ownerId, clientId),
      this.loyaltyService.getRules(this.ownerId),
    ]);

    this.client.set(client);
    this.progress.set(progress);
    this.rules.set(rules);
    this.loading.set(false);
  }

  currentRule(): LoyaltyRuleRow | undefined {
    const progress = this.progress();
    if (!progress) return undefined;
    return this.rules().find((r) => r.stage_order === progress.current_stage_order);
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
    const client = this.client()!;
    const progress = this.progress()!;
    if (!this.ownerId || !client.phone) return;

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
  }
}
