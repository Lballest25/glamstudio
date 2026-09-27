import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClientInput, ClientsService } from './clients.service';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1>{{ clientId() ? 'Editar clienta' : 'Nueva clienta' }}</h1>

    @if (loading()) {
      <p class="hint">Cargando…</p>
    } @else {
      <form (ngSubmit)="save()" class="card" style="max-width: 480px;">
        <label class="field">
          Nombre completo
          <input type="text" name="full_name" [(ngModel)]="form.full_name" required />
        </label>
        <label class="field">
          Teléfono
          <input type="tel" name="phone" [(ngModel)]="form.phone" placeholder="3001234567" />
        </label>
        <label class="field">
          Email
          <input type="email" name="email" [(ngModel)]="form.email" />
        </label>
        <label class="field">
          Fecha de nacimiento
          <input type="date" name="birth_date" [(ngModel)]="form.birth_date" />
        </label>
        <label class="field">
          Notas
          <textarea name="notes" rows="3" [(ngModel)]="form.notes"></textarea>
        </label>

        @if (errorMessage()) {
          <p class="error-text">{{ errorMessage() }}</p>
        }

        <div style="display:flex; gap:8px;">
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : 'Guardar' }}
          </button>
          <button type="button" class="btn" (click)="cancel()">Cancelar</button>
        </div>
      </form>
    }
  `,
})
export class ClientFormComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  clientId = signal<string | null>(null);

  form: ClientInput = { full_name: '', phone: null, email: null, birth_date: null, notes: null };

  private ownerId: string | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly clientsService: ClientsService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    this.ownerId = this.auth.currentUser()?.id ?? null;
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
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
  }

  async save() {
    if (!this.form.full_name) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      if (this.clientId()) {
        await this.clientsService.updateClient(this.clientId()!, this.form);
        await this.router.navigate(['/admin/clientas', this.clientId()]);
      } else if (this.ownerId) {
        const created = await this.clientsService.createClient(this.ownerId, this.form);
        await this.router.navigate(['/admin/clientas', created.id]);
      }
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo guardar la clienta.');
    } finally {
      this.saving.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/admin/clientas']);
  }
}
