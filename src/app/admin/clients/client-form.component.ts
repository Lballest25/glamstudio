import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon.component';
import { ClientInput, ClientRow, ClientsService } from './clients.service';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="page page-narrow fade-in">
      <a class="back-link" [routerLink]="clientId() ? ['/admin/clientas', clientId()] : ['/admin/clientas']">
        <app-icon name="arrow-left" [size]="18" />
        {{ clientId() ? 'Perfil' : 'Clientas' }}
      </a>

      <header>
        <h1>{{ clientId() ? 'Editar clienta' : 'Nueva clienta' }}</h1>
        <p class="page-subtitle">
          {{ clientId() ? 'Actualiza sus datos de contacto.' : 'Registra sus datos para agendarle citas y llevar su fidelización.' }}
        </p>
      </header>

      @if (loading()) {
        <div class="card card-pad stack">
          @for (i of [1, 2, 3]; track i) {
            <span class="skeleton" style="height: 48px"></span>
          }
        </div>
      } @else {
        <form class="card card-pad stack" (ngSubmit)="save()">
          <label class="field">
            <span class="field-label">Nombre completo</span>
            <span class="input-icon">
              <app-icon name="user" [size]="18" />
              <input class="input" name="full_name" [(ngModel)]="form.full_name" autocomplete="off" required />
            </span>
          </label>

          <div class="form-grid">
            <label class="field">
              <span class="field-label">Celular</span>
              <span class="input-icon">
                <app-icon name="phone" [size]="18" />
                <input
                  class="input"
                  type="tel"
                  inputmode="tel"
                  name="phone"
                  [(ngModel)]="form.phone"
                  placeholder="300 123 4567"
                />
              </span>
            </label>
            <label class="field">
              <span class="field-label">Correo <span class="optional">(opcional)</span></span>
              <span class="input-icon">
                <app-icon name="mail" [size]="18" />
                <input class="input" type="email" inputmode="email" name="email" [(ngModel)]="form.email" />
              </span>
            </label>
          </div>

          <label class="field">
            <span class="field-label">Fecha de nacimiento <span class="optional">(opcional)</span></span>
            <input class="input" type="date" name="birth_date" [(ngModel)]="form.birth_date" />
            <span class="field-hint">Te avisamos el día de su cumpleaños para felicitarla.</span>
          </label>

          <div class="field">
            <span class="field-label">Referida por <span class="optional">(opcional)</span></span>
            @if (referrer(); as r) {
              <div class="picked">
                <app-icon name="heart" [size]="18" />
                <span class="grow strong">{{ r.full_name }}</span>
                <button type="button" class="btn btn-ghost btn-sm" (click)="clearReferrer()">Quitar</button>
              </div>
            } @else {
              <span class="input-icon">
                <app-icon name="search" [size]="18" />
                <input
                  class="input"
                  type="search"
                  placeholder="Busca a la clienta que la recomendó…"
                  aria-label="Buscar quién la recomendó"
                  [(ngModel)]="referrerQuery"
                  (ngModelChange)="onReferrerQuery()"
                  name="referrerQuery"
                />
              </span>
              @if (referrerResults().length > 0) {
                <ul class="list results">
                  @for (c of referrerResults(); track c.id) {
                    <li>
                      <button type="button" class="list-row" (click)="pickReferrer(c)">
                        <span class="grow">
                          <span class="list-title" style="display: block">{{ c.full_name }}</span>
                          <span class="list-sub" style="display: block">{{ c.phone || '' }}</span>
                        </span>
                      </button>
                    </li>
                  }
                </ul>
              }
            }
            <span class="field-hint">
              Si la recomendó una clienta, las dos ganan un 10% de descuento cuando complete su primera cita.
              Solo cuenta si aún no ha completado ninguna.
            </span>
          </div>

          <label class="field">
            <span class="field-label">Notas <span class="optional">(opcional)</span></span>
            <textarea
              class="input"
              name="notes"
              rows="3"
              [(ngModel)]="form.notes"
              placeholder="Alergias, preferencias, tipo de pestañas…"
            ></textarea>
          </label>

          @if (errorMessage()) {
            <div class="alert alert-danger">
              <app-icon name="alert-circle" [size]="18" />
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <div class="row actions">
            <button type="button" class="btn btn-ghost" (click)="cancel()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || !form.full_name.trim()">
              @if (saving()) {
                <span class="spinner"></span>
              }
              {{ clientId() ? 'Guardar cambios' : 'Registrar clienta' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [
    `
      .actions {
        justify-content: flex-end;
        margin-top: 4px;
      }
      .picked {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: var(--r-md);
        background: var(--c-primary-soft);
        color: var(--c-primary);
      }
      .results {
        border: 1px solid var(--c-border);
        border-radius: var(--r-md);
        overflow: hidden;
      }
      .results .list-row {
        padding: 10px 14px;
      }
    `,
  ],
})
export class ClientFormComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly clientsService = inject(ClientsService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  clientId = signal<string | null>(null);

  form: ClientInput = { full_name: '', phone: null, email: null, birth_date: null, notes: null };

  referrer = signal<ClientRow | null>(null);
  referrerQuery = '';
  referrerResults = signal<ClientRow[]>([]);
  private referrerTouched = false;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.clientId.set(id);
    this.loading.set(true);
    const client = await this.clientsService.getClientById(id);
    if (client) {
      this.form = {
        full_name: client.full_name,
        phone: client.phone,
        email: client.email,
        birth_date: client.birth_date,
        notes: client.notes,
      };
      if (client.referred_by) this.referrer.set(await this.clientsService.getClientById(client.referred_by));
    }
    this.loading.set(false);
  }

  onReferrerQuery() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(async () => {
      const ownerId = this.auth.currentUser()?.id;
      if (!ownerId || this.referrerQuery.trim().length < 2) {
        this.referrerResults.set([]);
        return;
      }
      const results = await this.clientsService.listClients(ownerId, this.referrerQuery);
      this.referrerResults.set(results.filter((c) => c.id !== this.clientId()).slice(0, 5));
    }, 250);
  }

  pickReferrer(client: ClientRow) {
    this.referrer.set(client);
    this.referrerResults.set([]);
    this.referrerQuery = '';
    this.referrerTouched = true;
  }

  clearReferrer() {
    this.referrer.set(null);
    this.referrerTouched = true;
  }

  async save() {
    const ownerId = this.auth.currentUser()?.id;
    if (!this.form.full_name.trim() || !ownerId) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    const payload: ClientInput = {
      full_name: this.form.full_name.trim(),
      phone: this.form.phone?.trim() || null,
      email: this.form.email?.trim() || null,
      birth_date: this.form.birth_date || null,
      notes: this.form.notes?.trim() || null,
    };
    // Only touch the column when the owner changed it (or it already had a value).
    if (this.referrerTouched || this.referrer()) payload.referred_by = this.referrer()?.id ?? null;

    try {
      if (this.clientId()) {
        await this.clientsService.updateClient(this.clientId()!, payload);
        this.toast.success('Datos actualizados');
        await this.router.navigate(['/admin/clientas', this.clientId()]);
      } else {
        const created = await this.clientsService.createClient(ownerId, payload);
        this.toast.success('Clienta registrada');
        await this.router.navigate(['/admin/clientas', created.id]);
      }
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      this.saving.set(false);
    }
  }

  cancel() {
    this.router.navigate(this.clientId() ? ['/admin/clientas', this.clientId()] : ['/admin/clientas']);
  }
}
