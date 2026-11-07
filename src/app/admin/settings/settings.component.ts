import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { bookingUrl, copyToClipboard } from '../../core/utils/booking-link';
import { plural } from '../../core/utils/format.util';
import { buildPoster, downloadDataUrl, printImage, qrDataUrl } from '../../core/utils/qr.util';
import { buildShareUri } from '../../core/utils/whatsapp.util';
import { IconComponent } from '../../shared/components/icon.component';
import { InstallGuideComponent } from '../../shared/components/install-guide.component';
import { SheetComponent } from '../../shared/components/sheet.component';
import { LoyaltyRuleRow, LoyaltyService } from '../loyalty/loyalty.service';
import { RecontactSettings, SettingsService, WorkingHours } from './settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, InstallGuideComponent, SheetComponent],
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
            <button type="button" class="btn" (click)="openQr()">
              <app-icon name="qr-code" [size]="17" />
              Código QR
            </button>
            <a class="btn btn-ghost" [href]="link" target="_blank" rel="noopener">
              <app-icon name="external-link" [size]="17" />
              Ver
            </a>
          </div>
        </div>
      </section>

      <section class="stack group">
        <p class="section-title">Instalar en tu celular</p>
        <div class="card card-pad stack">
          <div class="row">
            <span class="tile tone-primary"><app-icon name="smartphone" [size]="20" /></span>
            <div class="grow">
              <h3>GlamStudio como app</h3>
              <p class="muted small">Un icono en tu pantalla de inicio, sin barra del navegador.</p>
            </div>
          </div>
          <app-install-guide />
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
        <p class="section-title">Aviso de clientas que vuelven</p>
        <div class="card card-pad stack">
          <div class="row">
            <span class="tile tone-primary"><app-icon name="repeat" [size]="20" /></span>
            <div class="grow">
              <h3>Aviso por correo cada 3 días</h3>
              <p class="muted small">Te escribimos con las clientas que ya les toca volver y un botón de WhatsApp para cada una.</p>
            </div>
            <label class="switch" title="Activar o desactivar el aviso">
              <input type="checkbox" [checked]="recontact.enabled" (change)="recontact.enabled = !recontact.enabled" aria-label="Activar aviso" />
              <span></span>
            </label>
          </div>

          @if (recontact.enabled) {
            <div class="field">
              <span class="field-label">Avisar cuando lleven sin venir más de…</span>
              <div class="chips">
                @for (o of recontactOptions; track o.days) {
                  <button type="button" class="chip" [class.is-active]="recontact.days === o.days" (click)="recontact.days = o.days">
                    {{ o.label }}
                  </button>
                }
              </div>
            </div>
            <label class="field">
              <span class="field-label">Correo para el aviso <span class="optional">(opcional)</span></span>
              <input class="input" type="email" inputmode="email" [(ngModel)]="recontact.email" placeholder="Si lo dejas vacío, el de tu cuenta" />
            </label>
          }

          <div class="row row-wrap" style="justify-content: flex-end">
            <button type="button" class="btn" [disabled]="testing()" (click)="sendTest()">
              @if (testing()) {
                <span class="spinner"></span>
              } @else {
                <app-icon name="bell" [size]="17" />
              }
              Enviar aviso de prueba
            </button>
            <button type="button" class="btn btn-primary" [disabled]="savingRecontact()" (click)="saveRecontact()">
              @if (savingRecontact()) {
                <span class="spinner"></span>
              }
              Guardar
            </button>
          </div>
        </div>
        <p class="field-hint">
          Solo se incluyen clientas sin cita agendada, y no se repite una que ya te avisamos en las últimas 2 semanas.
        </p>
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

    <app-sheet [open]="qrOpen()" title="Código QR de reservas" (closed)="qrOpen.set(false)">
      <div class="stack qr-sheet">
        @if (qrImage()) {
          <img [src]="qrImage()" alt="Código QR para reservar" class="qr-img" />
        } @else {
          <span class="skeleton" style="width: 240px; height: 240px; margin: 0 auto"></span>
        }
        <p class="muted small" style="text-align: center">
          Quien lo escanee con la cámara del celular abre tu página de reservas.
        </p>
        <div class="row row-wrap" style="justify-content: center">
          <button type="button" class="btn btn-primary" [disabled]="!qrImage()" (click)="printPoster()">
            <app-icon name="printer" [size]="17" />
            Imprimir cartel
          </button>
          <button type="button" class="btn" [disabled]="!qrImage()" (click)="downloadQr()">
            <app-icon name="download" [size]="17" />
            Descargar QR
          </button>
          <button type="button" class="btn btn-ghost" [disabled]="!qrImage()" (click)="downloadPoster()">
            <app-icon name="image" [size]="17" />
            Descargar cartel
          </button>
        </div>
      </div>
    </app-sheet>
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
      .steps {
        margin: 0;
        padding-left: 20px;
        color: var(--c-text-2);
        font-size: 14px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .qr-img {
        width: min(280px, 100%);
        margin: 0 auto;
        border-radius: var(--r-md);
        border: 1px solid var(--c-border);
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
      const [hours, rules, recontact] = await Promise.all([
        this.settingsService.getWorkingHours(this.ownerId),
        this.loyaltyService.getRules(this.ownerId),
        this.settingsService.getRecontact(this.ownerId),
      ]);
      this.hours = { start: hours.start.slice(0, 5), end: hours.end.slice(0, 5) };
      this.rules.set(rules);
      this.recontact = recontact;
    } catch {
      this.toast.error('No se pudieron cargar los ajustes.');
    } finally {
      this.loading.set(false);
    }
  }

  readonly recontactOptions = [
    { days: 21, label: '3 semanas' },
    { days: 30, label: '1 mes' },
    { days: 60, label: '2 meses' },
    { days: 90, label: '3 meses' },
  ];
  recontact: RecontactSettings = { enabled: true, days: 21, email: null };
  savingRecontact = signal(false);
  testing = signal(false);

  async saveRecontact() {
    if (!this.ownerId) return;
    this.savingRecontact.set(true);
    try {
      await this.settingsService.setRecontact(this.ownerId, {
        ...this.recontact,
        email: this.recontact.email?.trim() || null,
      });
      this.toast.success('Aviso actualizado');
    } catch {
      this.toast.error('No se pudo guardar el aviso.');
    } finally {
      this.savingRecontact.set(false);
    }
  }

  // Saves first so the test uses what's on screen, then asks the Edge Function
  // to send right away (it ignores the 3-day schedule for manual tests).
  async sendTest() {
    await this.saveRecontact();
    this.testing.set(true);
    try {
      const result = await this.settingsService.sendRecontactTest();
      if (result.ok) this.toast.success(result.message);
      else this.toast.error(result.message);
    } finally {
      this.testing.set(false);
    }
  }

  qrOpen = signal(false);
  qrImage = signal<string | null>(null);
  private posterImage: string | null = null;

  async openQr() {
    this.qrOpen.set(true);
    if (this.qrImage()) return;
    try {
      this.qrImage.set(await qrDataUrl(this.link, 720));
    } catch {
      this.qrOpen.set(false);
      this.toast.error('No se pudo generar el código QR.');
    }
  }

  private async poster(): Promise<string> {
    this.posterImage ??= await buildPoster(this.link);
    return this.posterImage;
  }

  downloadQr() {
    const qr = this.qrImage();
    if (qr) downloadDataUrl(qr, 'glamstudio-qr-reservas.png');
  }

  async downloadPoster() {
    downloadDataUrl(await this.poster(), 'glamstudio-cartel-reservas.png');
  }

  async printPoster() {
    const ok = printImage(await this.poster());
    if (!ok) this.toast.error('Tu navegador bloqueó la ventana. Usa "Descargar cartel" e imprímelo.');
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
