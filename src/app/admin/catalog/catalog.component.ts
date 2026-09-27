import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { formatCurrency } from '../../core/utils/currency.util';
import { ServiceCategory } from '../../core/models/database.types';
import { CatalogService, ServiceInput, ServiceRow } from './catalog.service';

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  pestañas: 'Pestañas',
  cejas: 'Cejas',
  depilacion: 'Depilación',
  tratamiento: 'Tratamiento',
  otro: 'Otro',
};

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1>Catálogo de servicios</h1>
      <button class="btn btn-primary" (click)="startCreate()">+ Nuevo servicio</button>
    </div>

    @if (formVisible()) {
      <div class="card" style="margin-bottom: 20px;">
        <h2 style="margin-top:0;">{{ editingId() ? 'Editar servicio' : 'Nuevo servicio' }}</h2>
        <form (ngSubmit)="save()">
          <label class="field">
            Nombre
            <input type="text" name="name" [(ngModel)]="form.name" required />
          </label>
          <label class="field">
            Categoría
            <select name="category" [(ngModel)]="form.category" required>
              @for (cat of categories; track cat) {
                <option [value]="cat">{{ categoryLabel(cat) }}</option>
              }
            </select>
          </label>
          <label class="field">
            Precio
            <input type="number" name="base_price" min="0" step="1000" [(ngModel)]="form.base_price" required />
          </label>
          <label class="field">
            Duración (minutos)
            <input type="number" name="duration_min" min="5" step="5" [(ngModel)]="form.duration_min" required />
          </label>
          <label class="field">
            Descripción
            <textarea name="description" rows="2" [(ngModel)]="form.description"></textarea>
          </label>

          @if (errorMessage()) {
            <p class="error-text">{{ errorMessage() }}</p>
          }

          <div style="display:flex; gap:8px;">
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              {{ saving() ? 'Guardando…' : 'Guardar' }}
            </button>
            <button type="button" class="btn" (click)="cancelForm()">Cancelar</button>
          </div>
        </form>
      </div>
    }

    @if (loading()) {
      <p class="hint">Cargando…</p>
    } @else if (services().length === 0) {
      <p class="empty-state">Aún no tienes servicios registrados.</p>
    } @else {
      <ul class="list">
        @for (service of services(); track service.id) {
          <li class="list-item">
            <span style="flex:1; font-weight:600;" [style.opacity]="service.is_active ? 1 : 0.5">
              {{ service.name }}
              <span class="hint">· {{ categoryLabel(service.category) }} · {{ service.duration_min }} min</span>
            </span>
            <span style="font-weight:700; color: var(--color-primary-dark);">{{ formatCurrency(service.base_price) }}</span>
            <button class="btn btn-sm" (click)="startEdit(service)">Editar</button>
            <button class="btn btn-sm" (click)="toggleActive(service)">
              {{ service.is_active ? 'Desactivar' : 'Activar' }}
            </button>
          </li>
        }
      </ul>
    }
  `,
})
export class CatalogComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  formVisible = signal(false);
  editingId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  services = signal<ServiceRow[]>([]);

  categories: ServiceCategory[] = ['pestañas', 'cejas', 'depilacion', 'tratamiento', 'otro'];
  form: ServiceInput = this.emptyForm();

  formatCurrency = formatCurrency;

  private ownerId: string | null = null;

  constructor(private readonly auth: AuthService, private readonly catalog: CatalogService) {}

  async ngOnInit() {
    this.ownerId = this.auth.currentUser()?.id ?? null;
    await this.reload();
  }

  private emptyForm(): ServiceInput {
    return { name: '', description: null, category: 'otro', base_price: 0, duration_min: 60 };
  }

  private async reload() {
    if (!this.ownerId) return;
    this.loading.set(true);
    this.services.set(await this.catalog.getAllServices(this.ownerId));
    this.loading.set(false);
  }

  categoryLabel(cat: ServiceCategory): string {
    return CATEGORY_LABELS[cat];
  }

  startCreate() {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.errorMessage.set(null);
    this.formVisible.set(true);
  }

  startEdit(service: ServiceRow) {
    this.editingId.set(service.id);
    this.form = {
      name: service.name,
      description: service.description,
      category: service.category,
      base_price: service.base_price,
      duration_min: service.duration_min,
    };
    this.errorMessage.set(null);
    this.formVisible.set(true);
  }

  cancelForm() {
    this.formVisible.set(false);
  }

  async save() {
    if (!this.ownerId || !this.form.name) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      if (this.editingId()) {
        await this.catalog.updateService(this.editingId()!, this.form);
      } else {
        await this.catalog.createService(this.ownerId, this.form);
      }
      this.formVisible.set(false);
      await this.reload();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo guardar el servicio.');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleActive(service: ServiceRow) {
    await this.catalog.toggleActive(service.id, !service.is_active);
    await this.reload();
  }
}
