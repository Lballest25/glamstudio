import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ExpenseCategory } from '../../core/models/database.types';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { formatCurrency } from '../../core/utils/currency.util';
import { formatDateMedium, formatMonthYear, parseISODate, plural, toLocalISODate } from '../../core/utils/format.util';
import { EXPENSE_CATEGORIES, expenseMeta } from '../../core/utils/labels';
import { IconComponent } from '../../shared/components/icon.component';
import { SheetComponent } from '../../shared/components/sheet.component';
import { ExpenseRow, ExpensesService } from './expenses.service';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, SheetComponent],
  template: `
    <div class="page page-narrow fade-in">
      <a class="back-link" routerLink="/admin/reportes">
        <app-icon name="arrow-left" [size]="18" />
        Reportes
      </a>

      <header class="page-header">
        <div>
          <h1>Gastos</h1>
          <p class="page-subtitle">Lo que invertiste en el estudio este mes.</p>
        </div>
        <button type="button" class="btn btn-primary" (click)="openForm()">
          <app-icon name="plus" [size]="18" />
          Nuevo gasto
        </button>
      </header>

      <div class="month-switch" style="align-self: flex-start">
        <button type="button" class="btn btn-ghost btn-icon btn-sm" (click)="shiftMonth(-1)" aria-label="Mes anterior">
          <app-icon name="chevron-left" [size]="18" />
        </button>
        <strong>{{ monthLabel() }}</strong>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" [disabled]="isCurrentMonth()" (click)="shiftMonth(1)" aria-label="Mes siguiente">
          <app-icon name="chevron-right" [size]="18" />
        </button>
      </div>

      <section class="card card-pad total-card">
        <div>
          <span class="stat-label">Total del mes</span>
          <div class="stat-value total">{{ formatCurrency(total()) }}</div>
          <span class="subtle small">{{ plural(expenses().length, 'registro') }}</span>
        </div>
        @if (breakdown().length) {
          <div class="breakdown">
            @for (b of breakdown(); track b.category) {
              <span class="badge">
                <app-icon [name]="meta(b.category).icon" [size]="13" />
                {{ meta(b.category).label }} · {{ formatCurrency(b.total) }}
              </span>
            }
          </div>
        }
      </section>

      <section class="card">
        @if (loading()) {
          @for (i of [1, 2, 3]; track i) {
            <div class="skeleton-row">
              <span class="skeleton" style="width: 42px; height: 42px; border-radius: 14px"></span>
              <span class="grow"><span class="skeleton" style="height: 14px; width: 55%"></span></span>
            </div>
          }
        } @else if (expenses().length === 0) {
          <div class="empty">
            <span class="empty-icon"><app-icon name="receipt" [size]="26" /></span>
            <span class="empty-title">Sin gastos este mes</span>
            <span>Registrar tus gastos te permite ver tu ganancia real.</span>
          </div>
        } @else {
          <ul class="list">
            @for (expense of expenses(); track expense.id) {
              <li class="list-row">
                <span class="tile tone-danger"><app-icon [name]="meta(expense.category).icon" [size]="20" /></span>
                <span class="grow">
                  <span class="list-title truncate" style="display: block">{{ expense.description }}</span>
                  <span class="list-sub" style="display: block">{{ meta(expense.category).label }} · {{ formatDateMedium(expense.spent_at) }}</span>
                </span>
                <span class="strong num">{{ formatCurrency(expense.amount) }}</span>
                <button
                  type="button"
                  class="btn btn-ghost btn-icon btn-sm"
                  (click)="remove(expense)"
                  [attr.aria-label]="'Eliminar ' + expense.description"
                >
                  <app-icon name="trash" [size]="16" />
                </button>
              </li>
            }
          </ul>
        }
      </section>
    </div>

    <app-sheet [open]="formOpen()" title="Nuevo gasto" (closed)="formOpen.set(false)">
      <form class="stack" (ngSubmit)="save()">
        <label class="field">
          <span class="field-label">Descripción</span>
          <input class="input" name="description" [(ngModel)]="description" placeholder="Ej. Pegamento para pestañas" required />
        </label>
        <div class="field">
          <span class="field-label">Categoría</span>
          <div class="chips wrap">
            @for (cat of categories; track cat) {
              <button type="button" class="chip" [class.is-active]="category === cat" (click)="category = cat">
                <app-icon [name]="meta(cat).icon" [size]="15" />
                {{ meta(cat).label }}
              </button>
            }
          </div>
        </div>
        <div class="form-grid">
          <label class="field">
            <span class="field-label">Monto</span>
            <input class="input" type="number" inputmode="numeric" min="1" name="amount" [(ngModel)]="amount" required />
          </label>
          <label class="field">
            <span class="field-label">Fecha</span>
            <input class="input" type="date" name="spent_at" [(ngModel)]="spentAt" required />
          </label>
        </div>
        <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="saving() || !description.trim() || !(amount > 0)">
          @if (saving()) {
            <span class="spinner"></span>
          }
          Guardar gasto
        </button>
      </form>
    </app-sheet>
  `,
  styles: [
    `
      .total-card {
        display: flex;
        flex-direction: column;
        gap: 14px;
        background: linear-gradient(135deg, var(--c-surface) 0%, var(--c-danger-soft) 160%);
      }
      .total {
        color: var(--c-danger);
        font-size: 30px;
        margin: 2px 0;
      }
      .breakdown {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .chips.wrap {
        flex-wrap: wrap;
      }
    `,
  ],
})
export class ExpensesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly expensesService = inject(ExpensesService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly categories = EXPENSE_CATEGORIES;

  loading = signal(true);
  saving = signal(false);
  formOpen = signal(false);
  expenses = signal<ExpenseRow[]>([]);
  private cursor = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  total = computed(() => this.expenses().reduce((sum, e) => sum + e.amount, 0));
  monthLabel = computed(() => formatMonthYear(this.cursor()));
  breakdown = computed(() => {
    const totals = new Map<string, number>();
    for (const e of this.expenses()) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    return [...totals.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
  });

  description = '';
  category: ExpenseCategory = 'insumos';
  amount = 0;
  spentAt = toLocalISODate(new Date());

  meta = expenseMeta;
  formatCurrency = formatCurrency;
  formatDateMedium = formatDateMedium;
  plural = plural;

  private ownerId: string | null = null;

  async ngOnInit() {
    this.ownerId = this.auth.currentUser()?.id ?? null;
    const params = this.route.snapshot.queryParamMap;
    const year = Number(params.get('year'));
    const month = Number(params.get('month'));
    if (year && month) this.cursor.set(new Date(year, month - 1, 1));
    await this.reload();
  }

  isCurrentMonth(): boolean {
    const now = new Date();
    return this.cursor().getFullYear() === now.getFullYear() && this.cursor().getMonth() === now.getMonth();
  }

  async shiftMonth(delta: number) {
    if (delta > 0 && this.isCurrentMonth()) return;
    const c = this.cursor();
    this.cursor.set(new Date(c.getFullYear(), c.getMonth() + delta, 1));
    await this.reload();
  }

  openForm() {
    this.description = '';
    this.category = 'insumos';
    this.amount = 0;
    this.spentAt = toLocalISODate(new Date());
    this.formOpen.set(true);
  }

  private async reload() {
    if (!this.ownerId) return;
    this.loading.set(true);
    try {
      const c = this.cursor();
      this.expenses.set(await this.expensesService.getExpensesByMonth(this.ownerId, c.getFullYear(), c.getMonth() + 1));
    } catch {
      this.toast.error('No se pudieron cargar los gastos.');
    } finally {
      this.loading.set(false);
    }
  }

  async save() {
    if (!this.ownerId || !this.description.trim() || !(this.amount > 0)) return;
    this.saving.set(true);
    try {
      // Noon local time keeps the expense on the chosen day regardless of UTC offset.
      const spentAt = parseISODate(this.spentAt);
      spentAt.setHours(12);
      await this.expensesService.createExpense(this.ownerId, {
        description: this.description.trim(),
        category: this.category,
        amount: Number(this.amount),
        spent_at: spentAt.toISOString(),
      });
      this.formOpen.set(false);
      this.toast.success('Gasto registrado');
      await this.reload();
    } catch {
      this.toast.error('No se pudo guardar el gasto.');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(expense: ExpenseRow) {
    if (!confirm(`¿Eliminar "${expense.description}"?`)) return;
    try {
      await this.expensesService.deleteExpense(expense.id);
      this.toast.success('Gasto eliminado');
      await this.reload();
    } catch {
      this.toast.error('No se pudo eliminar el gasto.');
    }
  }
}
