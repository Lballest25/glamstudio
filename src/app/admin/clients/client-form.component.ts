import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon.component';
import { ClientInput, ClientsService } from './clients.service';

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
    }
    this.loading.set(false);
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
