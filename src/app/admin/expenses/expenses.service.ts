import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { Database, ExpenseCategory } from '../../core/models/database.types';

export type ExpenseRow = Database['public']['Tables']['expenses']['Row'];

export interface ExpenseInput {
  description: string;
  category: ExpenseCategory;
  amount: number;
  spent_at: string;
  notes?: string | null;
}

// Port of lib/features/expenses/data/datasources/expenses_supabase_datasource.dart.
// Expenses are hard-deleted (unlike clients/services, which are soft-deactivated).
@Injectable({ providedIn: 'root' })
export class ExpensesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getExpensesByMonth(ownerId: string, year: number, month: number): Promise<ExpenseRow[]> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const { data, error } = await this.supabase.client
      .from('expenses')
      .select('*')
      .eq('owner_id', ownerId)
      .gte('spent_at', start.toISOString())
      .lte('spent_at', end.toISOString())
      .order('spent_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async createExpense(ownerId: string, input: ExpenseInput): Promise<void> {
    const { error } = await this.supabase.client.from('expenses').insert({ owner_id: ownerId, ...input });
    if (error) throw error;
  }

  async deleteExpense(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('expenses').delete().eq('id', id);
    if (error) throw error;
  }
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  insumos: 'Insumos',
  renta: 'Renta',
  servicios: 'Servicios',
  marketing: 'Marketing',
  otro: 'Otro',
};
