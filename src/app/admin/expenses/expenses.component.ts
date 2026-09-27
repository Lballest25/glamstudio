import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { formatCurrency } from '../../core/utils/currency.util';
import { ExpenseCategory } from '../../core/models/database.types';
import { EXPENSE_CATEGORY_LABELS, ExpenseInput, ExpenseRow, ExpensesService } from './expenses.service';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1>Gastos — {{ monthLabel() }}</h1>
      <button class="btn btn-primary" (click)="formVisible.set(!formVisible())">+ Nuevo gasto</button>
    </div>

    <div class="card" style="max-width:320px; margin-bottom:20px; text-align:center;">
      <span class="hint">Total del mes</span>
      <div style="font-size:22px; font-weight:800; color: var(--color-error);">{{ formatCurrency(total()) }}</div>
    </div>

    @if (formVisible()) {
      <form class="card" style="max-width:420px; margin-bottom:20px;" (ngSubmit)="save()">
        <label class="field">
          Descripción
          <input type="text" name="description" [(ngModel)]="form.description" required />
        </label>
        <label class="field">
          Categoría
          <select name="category" [(ngModel)]="form.category">
            @for (cat of categories; track cat) {
              <option [value]="cat">{{ categoryLabel(cat) }}</option>
            }
          </select>
        </label>
        <label class="field">
          Monto
          <input type="number" name="amount" min="1" [(ngModel)]="form.amount" required />
        </label>
        <label class="field">
          Fecha
          <input type="date" name="spent_at" [(ngModel)]="spentAtDate" required />
        </label>
        <div style="display:flex; gap:8px;">
          <button type="submit" class="btn btn-primary" [disabled]="saving()">Guardar</button>
          <button type="button" class="btn" (click)="formVisible.set(false)">Cancelar</button>
        </div>
      </form>
    }

    @if (loading()) {
      <p class="hint">Cargando…</p>
    } @else if (expenses().length === 0) {
      <p class="empty-state">Sin gastos registrados este mes.</p>
    } @else {
      <ul class="list">
        @for (expense of expenses(); track expense.id) {
          <li class="list-item">
            <span style="flex:1;">
              <div style="font-weight:600;">{{ expense.description }}</div>
              <div class="hint">{{ categoryLabel(expense.category) }} · {{ formatDate(expense.spent_at) }}</div>
            </span>
            <span style="font-weight:700;">{{ formatCurrency(expense.amount) }}</span>
            <button class="btn btn-sm btn-danger" (click)="remove(expense)">Eliminar</button>
          </li>
        }
      </ul>
    }
  `,
})
export class ExpensesComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  formVisible = signal(false);
  expenses = signal<ExpenseRow[]>([]);
  categories: ExpenseCategory[] = ['insumos', 'renta', 'servicios', 'marketing', 'otro'];

  form: Omit<ExpenseInput, 'spent_at'> = { description: '', category: 'otro', amount: 0 };
  spentAtDate = new Date().toISOString().slice(0, 10);

  private year: number;
  private month: number;
  private ownerId: string | null = null;

  formatCurrency = formatCurrency;

  constructor(
    private readonly auth: AuthService,
    private readonly expensesService: ExpensesService,
    private readonly route: ActivatedRoute
  ) {
    const now = new Date();
    this.year = Number(this.route.snapshot.queryParamMap.get('year')) || now.getFullYear();
    this.month = Number(this.route.snapshot.queryParamMap.get('month')) || now.getMonth() + 1;
  }

  async ngOnInit() {
    this.ownerId = this.auth.currentUser()?.id ?? null;
    await this.reload();
  }

  monthLabel(): string {
    return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(
      new Date(this.year, this.month - 1, 1)
    );
  }

  categoryLabel(cat: ExpenseCategory): string {
    return EXPENSE_CATEGORY_LABELS[cat];
  }

  formatDate(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(iso));
  }

  total(): number {
    return this.expenses().reduce((sum, e) => sum + e.amount, 0);
  }

  private async reload() {
    if (!this.ownerId) return;
    this.loading.set(true);
    this.expenses.set(await this.expensesService.getExpensesByMonth(this.ownerId, this.year, this.month));
    this.loading.set(false);
  }

  async save() {
    if (!this.ownerId || !this.form.description || !this.form.amount) return;
    this.saving.set(true);
    try {
      await this.expensesService.createExpense(this.ownerId, {
        ...this.form,
        spent_at: new Date(this.spentAtDate).toISOString(),
      });
      this.form = { description: '', category: 'otro', amount: 0 };
      this.formVisible.set(false);
      await this.reload();
    } finally {
      this.saving.set(false);
    }
  }

  async remove(expense: ExpenseRow) {
    if (!confirm(`¿Eliminar el gasto "${expense.description}"?`)) return;
    await this.expensesService.deleteExpense(expense.id);
    await this.reload();
  }
}
