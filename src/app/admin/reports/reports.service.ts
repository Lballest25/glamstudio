import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';

export interface MonthlyRevenuePoint {
  year: number;
  month: number;
  label: string;
  total: number;
}

export interface TopServiceRow {
  serviceId: string;
  name: string;
  count: number;
}

export interface TopClientRow {
  clientId: string;
  name: string;
  total: number;
}

export interface MonthReport {
  revenue: number;
  sessionCount: number;
  expensesTotal: number;
  netProfit: number;
  topServices: TopServiceRow[];
  topClients: TopClientRow[];
}

// Port of lib/features/reports/data/datasources/reports_supabase_datasource.dart —
// several independent queries aggregated client-side, same approach the
// Flutter app used (revenue comes from `payments`, session count from
// completed `appointments`; they usually but don't always agree).
@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getLast6MonthsRevenue(ownerId: string): Promise<MonthlyRevenuePoint[]> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const { data, error } = await this.supabase.client
      .from('payments')
      .select('amount, paid_at')
      .eq('owner_id', ownerId)
      .gte('paid_at', start.toISOString());
    if (error) throw error;

    const points: MonthlyRevenuePoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      points.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(d),
        total: 0,
      });
    }

    for (const row of data ?? []) {
      const d = new Date(row.paid_at);
      const point = points.find((p) => p.year === d.getFullYear() && p.month === d.getMonth() + 1);
      if (point) point.total += row.amount;
    }

    return points;
  }

  async getMonthReport(ownerId: string, year: number, month: number): Promise<MonthReport> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const [paymentsRes, appointmentsRes, expensesRes] = await Promise.all([
      this.supabase.client
        .from('payments')
        .select('amount, client_id, clients(full_name)')
        .eq('owner_id', ownerId)
        .gte('paid_at', start.toISOString())
        .lte('paid_at', end.toISOString()),
      this.supabase.client
        .from('appointments')
        .select('id, appointment_services(service_id, quantity, services(name))')
        .eq('owner_id', ownerId)
        .eq('status', 'completed')
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString()),
      this.supabase.client
        .from('expenses')
        .select('amount')
        .eq('owner_id', ownerId)
        .gte('spent_at', start.toISOString())
        .lte('spent_at', end.toISOString()),
    ]);

    if (paymentsRes.error) throw paymentsRes.error;
    if (appointmentsRes.error) throw appointmentsRes.error;
    if (expensesRes.error) throw expensesRes.error;

    const payments = paymentsRes.data ?? [];
    const appointments = appointmentsRes.data ?? [];
    const expenses = expensesRes.data ?? [];

    const revenue = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const expensesTotal = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);

    const serviceCounts = new Map<string, TopServiceRow>();
    for (const appt of appointments as any[]) {
      for (const line of appt.appointment_services ?? []) {
        const existing = serviceCounts.get(line.service_id);
        const name = line.services?.name ?? 'Servicio';
        if (existing) existing.count += line.quantity;
        else serviceCounts.set(line.service_id, { serviceId: line.service_id, name, count: line.quantity });
      }
    }

    const clientTotals = new Map<string, TopClientRow>();
    for (const p of payments as any[]) {
      const existing = clientTotals.get(p.client_id);
      const name = p.clients?.full_name ?? 'Clienta';
      if (existing) existing.total += p.amount;
      else clientTotals.set(p.client_id, { clientId: p.client_id, name, total: p.amount });
    }

    return {
      revenue,
      sessionCount: appointments.length,
      expensesTotal,
      netProfit: revenue - expensesTotal,
      topServices: [...serviceCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5),
      topClients: [...clientTotals.values()].sort((a, b) => b.total - a.total).slice(0, 5),
    };
  }
}
