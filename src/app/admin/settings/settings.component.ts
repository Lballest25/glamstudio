import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LoyaltyRuleRow, LoyaltyService } from '../loyalty/loyalty.service';
import { SettingsService, WorkingHours } from './settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <h1>Configuración</h1>

    <section style="margin-bottom:28px;">
      <h3>Catálogo de servicios</h3>
      <a class="btn" routerLink="/admin/catalogo">Ir al catálogo →</a>
    </section>

    <section style="margin-bottom:28px;">
      <h3>Horario de atención</h3>
      @if (loading()) {
        <p class="hint">Cargando…</p>
      } @else {
        <div class="card" style="max-width:360px;">
          <div style="display:flex; gap:12px;">
            <label class="field" style="flex:1;">
              Abre
              <input type="time" [(ngModel)]="hours.start" />
            </label>
            <label class="field" style="flex:1;">
              Cierra
              <input type="time" [(ngModel)]="hours.end" />
            </label>
          </div>
          @if (savedMessage()) {
            <p class="hint" style="color: var(--color-success);">{{ savedMessage() }}</p>
          }
          <button class="btn btn-primary" [disabled]="saving()" (click)="saveHours()">
            {{ saving() ? 'Guardando…' : 'Guardar horario' }}
          </button>
        </div>
        <p class="hint" style="max-width:360px; margin-top:8px;">
          Este horario define los turnos disponibles en el portal público de citas (próximamente).
        </p>
      }
    </section>

    <section style="margin-bottom:28px;">
      <h3>Reglas de fidelización</h3>
      @if (rules().length === 0) {
        <p class="hint">Sin reglas configuradas.</p>
      } @else {
        <ul class="list" style="max-width:420px;">
          @for (rule of rules(); track rule.id) {
            <li class="list-item">
              <span class="badge">Etapa {{ rule.stage_order }}</span>
              <span style="flex:1;">{{ rule.description }}</span>
            </li>
          }
        </ul>
      }
    </section>

    <section>
      <h3>Cuenta</h3>
      <button class="btn btn-danger" (click)="signOut()">Cerrar sesión</button>
    </section>
  `,
})
export class SettingsComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  savedMessage = signal<string | null>(null);
  rules = signal<LoyaltyRuleRow[]>([]);
  hours: WorkingHours = { start: '09:00', end: '20:00' };

  private ownerId: string | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly settingsService: SettingsService,
    private readonly loyaltyService: LoyaltyService
  ) {}

  async ngOnInit() {
    this.ownerId = this.auth.currentUser()?.id ?? null;
    if (!this.ownerId) return;

    const [hours, rules] = await Promise.all([
      this.settingsService.getWorkingHours(this.ownerId),
      this.loyaltyService.getRules(this.ownerId),
    ]);
    this.hours = hours;
    this.rules.set(rules);
    this.loading.set(false);
  }

  async saveHours() {
    if (!this.ownerId) return;
    this.saving.set(true);
    this.savedMessage.set(null);
    try {
      await this.settingsService.setWorkingHours(this.ownerId, this.hours);
      this.savedMessage.set('Horario actualizado.');
    } finally {
      this.saving.set(false);
    }
  }

  async signOut() {
    await this.auth.signOut();
    location.href = '/admin/login';
  }
}
