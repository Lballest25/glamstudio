import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServiceCategory } from '../../core/models/database.types';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { formatCurrency } from '../../core/utils/currency.util';
import { formatDuration, plural } from '../../core/utils/format.util';
import { CATEGORY_ORDER, categoryMeta } from '../../core/utils/labels';
import { IconComponent } from '../../shared/components/icon.component';
import { SheetComponent } from '../../shared/components/sheet.component';
import { CatalogService, ServiceInput, ServiceRow } from './catalog.service';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [FormsModule, IconComponent, SheetComponent],
  template: `
    <div class="page fade-in">
      <header class="page-header">
        <div>
          <h1>Catálogo</h1>
          <p class="page-subtitle">
            {{ plural(activeCount(), 'servicio activo', 'servicios activos') }} · así los ven tus clientas al reservar
          </p>
        </div>
        <button type="button" class="btn btn-primary" (click)="startCreate()">
          <app-icon name="plus" [size]="18" />
          Nuevo servicio
        </button>
      </header>

      <div class="chips">
        <button type="button" class="chip" [class.is-active]="filter() === 'all'" (click)="filter.set('all')">
          Todos
        </button>
        @for (cat of categories; track cat) {
          <button type="button" class="chip" [class.is-active]="filter() === cat" (click)="filter.set(cat)">
            <app-icon [name]="meta(cat).icon" [size]="15" />
            {{ meta(cat).label }}
          </button>
        }
      </div>

      @if (loading()) {
        <section class="card">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="skeleton-row">
              <span class="skeleton" style="width: 42px; height: 42px; border-radius: 14px"></span>
              <span class="grow"><span class="skeleton" style="height: 14px; width: 50%"></span></span>
            </div>
          }
        </section>
      } @else if (groups().length === 0) {
        <section class="card empty">
          <span class="empty-icon"><app-icon name="sparkles" [size]="26" /></span>
          <span class="empty-title">Sin servicios en esta categoría</span>
          <button type="button" class="btn btn-soft btn-sm" (click)="startCreate()">
            <app-icon name="plus" [size]="16" />
            Agregar servicio
          </button>
        </section>
      } @else {
        @for (group of groups(); track group.category) {
          <section class="stack group">
            <p class="section-title">{{ meta(group.category).label }}</p>
            <div class="card">
              <ul class="list">
                @for (service of group.items; track service.id) {
                  <li class="list-row" [class.is-muted]="!service.is_active">
                    <span class="tile tone-primary"><app-icon [name]="meta(service.category).icon" [size]="20" /></span>
                    <span class="grow">
                      <span class="list-title truncate" style="display: block">{{ service.name }}</span>
                      <span class="list-sub" style="display: block">
                        {{ formatDuration(service.duration_min) }}
                        @if (!service.is_active) {
                          · Oculto
                        }
                      </span>
                    </span>
                    <span class="price num">{{ formatCurrency(service.base_price) }}</span>
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon btn-sm"
                      (click)="startEdit(service)"
                      [attr.aria-label]="'Editar ' + service.name"
                    >
                      <app-icon name="pencil" [size]="16" />
                    </button>
                    <label class="switch" [title]="service.is_active ? 'Visible para reservas' : 'Oculto'">
                      <input
                        type="checkbox"
                        [checked]="service.is_active"
                        (change)="toggleActive(service)"
                        [attr.aria-label]="(service.is_active ? 'Ocultar ' : 'Mostrar ') + service.name"
                      />
                      <span></span>
                    </label>
                  </li>
                }
              </ul>
            </div>
          </section>
        }
      }
    </div>

    <app-sheet [open]="formOpen()" [title]="editingId() ? 'Editar servicio' : 'Nuevo servicio'" (closed)="formOpen.set(false)">
      <form class="stack" (ngSubmit)="save()">
        <label class="field">
          <span class="field-label">Nombre</span>
          <input class="input" name="name" [(ngModel)]="form.name" placeholder="Ej. Lifting de pestañas" required />
        </label>
        <label class="field">
          <span class="field-label">Categoría</span>
          <select class="input" name="category" [(ngModel)]="form.category">
            @for (cat of categories; track cat) {
              <option [value]="cat">{{ meta(cat).label }}</option>
            }
          </select>
        </label>
        <div class="form-grid">
          <label class="field">
            <span class="field-label">Precio</span>
            <input class="input" type="number" inputmode="numeric" min="0" step="1000" name="base_price" [(ngModel)]="form.base_price" required />
          </label>
          <label class="field">
            <span class="field-label">Duración (min)</span>
            <input class="input" type="number" inputmode="numeric" min="5" step="5" name="duration_min" [(ngModel)]="form.duration_min" required />
          </label>
        </div>
        <label class="field">
          <span class="field-label">Descripción <span class="optional">(opcional)</span></span>
          <textarea class="input" name="description" rows="2" [(ngModel)]="form.description"></textarea>
        </label>

        @if (errorMessage()) {
          <div class="alert alert-danger">
            <app-icon name="alert-circle" [size]="18" />
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="saving() || !form.name.trim()">
          @if (saving()) {
            <span class="spinner"></span>
          }
          {{ editingId() ? 'Guardar cambios' : 'Crear servicio' }}
        </button>
      </form>
    </app-sheet>
  `,
  styles: [
    `
      .group {
        gap: 10px;
      }
      .price {
        font-weight: 800;
        white-space: nowrap;
      }
      .list-row {
        padding: 12px 16px 12px 20px;
      }
      @media (max-width: 599px) {
        .list-row {
          gap: 10px;
          padding: 12px 14px;
        }
        .tile {
          display: none;
        }
      }
    `,
  ],
})
export class CatalogComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);

  readonly categories = CATEGORY_ORDER;

  loading = signal(true);
  saving = signal(false);
  formOpen = signal(false);
  editingId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  services = signal<ServiceRow[]>([]);
  filter = signal<'all' | ServiceCategory>('all');

  activeCount = computed(() => this.services().filter((s) => s.is_active).length);
  groups = computed(() =>
    CATEGORY_ORDER.filter((c) => this.filter() === 'all' || this.filter() === c)
      .map((category) => ({ category, items: this.services().filter((s) => s.category === category) }))
      .filter((g) => g.items.length > 0)
  );

  form: ServiceInput = this.emptyForm();

  meta = categoryMeta;
  formatCurrency = formatCurrency;
  formatDuration = formatDuration;
  plural = plural;

  private ownerId: string | null = null;

  async ngOnInit() {
    this.ownerId = this.auth.currentUser()?.id ?? null;
    await this.reload();
  }

  private emptyForm(): ServiceInput {
    return { name: '', description: null, category: 'pestañas', base_price: 0, duration_min: 60 };
  }

  private async reload() {
    if (!this.ownerId) return;
    try {
      this.services.set(await this.catalog.getAllServices(this.ownerId));
    } catch {
      this.toast.error('No se pudo cargar el catálogo.');
    } finally {
      this.loading.set(false);
    }
  }

  startCreate() {
    this.editingId.set(null);
    this.form = this.emptyForm();
    if (this.filter() !== 'all') this.form.category = this.filter() as ServiceCategory;
    this.errorMessage.set(null);
    this.formOpen.set(true);
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
    this.formOpen.set(true);
  }

  async save() {
    if (!this.ownerId || !this.form.name.trim()) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    const payload: ServiceInput = {
      ...this.form,
      name: this.form.name.trim(),
      description: this.form.description?.trim() || null,
      base_price: Number(this.form.base_price) || 0,
      duration_min: Number(this.form.duration_min) || 60,
    };
    try {
      if (this.editingId()) {
        await this.catalog.updateService(this.editingId()!, payload);
        this.toast.success('Servicio actualizado');
      } else {
        await this.catalog.createService(this.ownerId, payload);
        this.toast.success('Servicio creado');
      }
      this.formOpen.set(false);
      await this.reload();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo guardar el servicio.');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleActive(service: ServiceRow) {
    const next = !service.is_active;
    this.services.update((list) => list.map((s) => (s.id === service.id ? { ...s, is_active: next } : s)));
    try {
      await this.catalog.toggleActive(service.id, next);
      this.toast.success(next ? 'Servicio visible para reservas' : 'Servicio ocultado');
    } catch {
      this.services.update((list) => list.map((s) => (s.id === service.id ? { ...s, is_active: !next } : s)));
      this.toast.error('No se pudo actualizar el servicio.');
    }
  }
}
