import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { bookingUrl, copyToClipboard } from '../../core/utils/booking-link';
import { plural } from '../../core/utils/format.util';
import { buildShareUri } from '../../core/utils/whatsapp.util';
import { IconComponent } from '../../shared/components/icon.component';
import { LoyaltyRuleRow, LoyaltyService } from '../loyalty/loyalty.service';
import { SettingsService, WorkingHours } from './settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="page page-narrow fade-in">
      <header>
        <h1>Ajustes</h1>
        <p class="page-subtitle">Configura cómo funciona tu estudio.</p>
      </header>

      <section class="stack group">
        <p class="section-title">Reservas en línea</p>
        <div class="card card-pad stack">
          <div class="row">
            <span class="tile tone-primary"><app-icon name="link" [size]="20" /></span>
            <div class="grow">
              <h3>Tu link de reservas</h3>
              <p class="muted small">Compártelo en WhatsApp, Instagram o donde quieras.</p>
            </div>
          </div>
          <div class="link-box">
            <span class="truncate">{{ link }}</span>
          </div>
          <div class="row row-wrap">
            <button type="button" class="btn btn-soft" (click)="copyLink()">
              <app-icon name="copy" [size]="17" />
              Copiar
            </button>
            <a class="btn btn-whatsapp" [href]="shareLink" target="_blank" rel="noopener">
              <app-icon name="message-circle" [size]="17" />
              Compartir
            </a>
            <a class="btn btn-ghost" [href]="link" target="_blank" rel="noopener">
              <app-icon name="external-link" [size]="17" />
              Ver
            </a>
          </div>
        </div>
      </section>

      <section class="stack group">
        <p class="section-title">Horario de atención</p>
        <div class="card card-pad stack">
          @if (loading()) {
            <span class="skeleton" style="height: 48px"></span>
          } @else {
            <div class="form-grid">
              <label class="field">
                <span class="field-label">Abre</span>
                <input class="input" type="time" step="1800" [(ngModel)]="hours.start" />
              </label>
              <label class="field">
                <span class="field-label">Cierra</span>
                <input class="input" type="time" step="1800" [(ngModel)]="hours.end" />
              </label>
            </div>
            <p class="field-hint">
              <app-icon name="info" [size]="14" style="vertical-align: -2px" />
              Tus clientas solo verán horarios disponibles dentro de este rango.
            </p>
            <div class="row" style="justify-content: flex-end">
              <button type="button" class="btn btn-primary" [disabled]="saving() || hours.start >= hours.end" (click)="saveHours()">
                @if (saving()) {
                  <span class="spinner"></span>
                }
                Guardar horario
              </button>
            </div>
          }
        </div>
      </section>

      <section class="stack group">
        <p class="section-title">Tu negocio</p>
        <div class="card">
          <ul class="list">
            <li>
              <a class="list-row" routerLink="/admin/catalogo">
                <span class="tile tone-primary"><app-icon name="sparkles" [size]="20" /></span>
                <span class="grow">
                  <span class="list-title" style="display: block">Catálogo de servicios</span>
                  <span class="list-sub" style="display: block">Precios, duración y visibilidad</span>
                </span>
                <app-icon name="chevron-right" [size]="18" class="chev" />
              </a>
            </li>
            <li>
              <a class="list-row" routerLink="/admin/reportes">
                <span class="tile tone-success"><app-icon name="chart" [size]="20" /></span>
                <span class="grow">
                  <span class="list-title" style="display: block">Reportes y gastos</span>
                  <span class="list-sub" style="display: block">Ingresos, ganancia y mejores clientas</span>
                </span>
                <app-icon name="chevron-right" [size]="18" class="chev" />
              </a>
            </li>
          </ul>
        </div>
      </section>

      <section class="stack group">
        <p class="section-title">Programa de fidelización</p>
        <div class="card">
          @if (rules().length === 0) {
            <p class="empty-note">Sin reglas configuradas.</p>
          } @else {
            <ul class="list">
              @for (rule of rules(); track rule.id) {
                <li class="list-row">
                  <span class="tile tone-gold"><app-icon [name]="rule.benefit_type === 'gift' ? 'gift' : 'percent'" [size]="18" /></span>
                  <span class="grow">
                    <span class="list-title" style="display: block">{{ rule.description }}</span>
                    <span class="list-sub" style="display: block">Etapa {{ rule.stage_order }} · {{ plural(rule.sessions_required, 'sesión', 'sesiones') }}</span>
                  </span>
                </li>
              }
            </ul>
          }
        </div>
        <p class="field-hint">El ciclo se reinicia automáticamente al completar la última etapa.</p>
      </section>

      <section class="stack group">
        <p class="section-title">Cuenta</p>
        <div class="card">
          <button type="button" class="list-row signout" (click)="signOut()">
            <span class="tile tone-danger"><app-icon name="log-out" [size]="18" /></span>
            <span class="grow list-title">Cerrar sesión</span>
          </button>
        </div>
      </section>

      <p class="version">GlamStudio Web · v1.0</p>
    </div>
  `,
  styles: [
    `
      .group {
        gap: 10px;
      }
      .link-box {
        display: flex;
        align-items: center;
        height: 46px;
        padding: 0 14px;
        border-radius: var(--r-md);
        background: var(--c-surface-2);
        border: 1px dashed var(--c-border-strong);
        font-weight: 600;
        font-size: 14px;
        color: var(--c-text-2);
      }
      .signout .list-title {
        color: var(--c-danger);
      }
      .empty-note {
        padding: 16px 20px;
        color: var(--c-text-3);
      }
      .version {
        text-align: center;
        font-size: 12px;
        color: var(--c-text-3);
        padding: 8px 0 16px;
      }
    `,
  ],
})
export class SettingsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly loyaltyService = inject(LoyaltyService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly link = bookingUrl();
  readonly shareLink = buildShareUri(`¡Agenda tu cita en GlamStudio! 💅✨\n${bookingUrl()}`);

  loading = signal(true);
  saving = signal(false);
  rules = signal<LoyaltyRuleRow[]>([]);
  hours: WorkingHours = { start: '09:00', end: '20:00' };

  plural = plural;

  private ownerId: string | null = null;

  async ngOnInit() {
    this.ownerId = this.auth.currentUser()?.id ?? null;
    if (!this.ownerId) return;

    try {
      const [hours, rules] = await Promise.all([
        this.settingsService.getWorkingHours(this.ownerId),
        this.loyaltyService.getRules(this.ownerId),
      ]);
      this.hours = { start: hours.start.slice(0, 5), end: hours.end.slice(0, 5) };
      this.rules.set(rules);
    } catch {
      this.toast.error('No se pudieron cargar los ajustes.');
    } finally {
      this.loading.set(false);
    }
  }

  async copyLink() {
    const ok = await copyToClipboard(this.link);
    if (ok) this.toast.success('Link copiado');
    else this.toast.show(this.link, 'info');
  }

  async saveHours() {
    if (!this.ownerId) return;
    this.saving.set(true);
    try {
      await this.settingsService.setWorkingHours(this.ownerId, this.hours);
      this.toast.success('Horario actualizado');
    } catch {
      this.toast.error('No se pudo guardar el horario.');
    } finally {
      this.saving.set(false);
    }
  }

  async signOut() {
    await this.auth.signOut();
    await this.router.navigateByUrl('/admin/login');
  }
}
