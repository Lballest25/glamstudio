import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';

export interface TodayAppointment {
  id: string;
  scheduled_at: string;
  status: string;
  client_name: string;
  client_phone: string | null;
}

export interface LoyaltyAlertRow {
  client_id: string;
  client_name: string;
  client_phone: string | null;
  alert_pending: boolean;
  benefit_pending: boolean;
  alert_message: string | null;
  pending_benefit_type: string | null;
  pending_benefit_value: number | null;
}

export interface BirthdayClient {
  id: string;
  full_name: string;
  phone: string | null;
}

// Mirrors lib/features/dashboard/ — composes read queries from several
// features (appointments, loyalty, clients) the same way the Flutter
// dashboard screen does, just without the mobile-only pull-to-refresh.
@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly supabase: SupabaseService) {}

  async getTodayAppointments(ownerId: string): Promise<TodayAppointment[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const { data, error } = await this.supabase.client
      .from('appointments')
      .select('id, scheduled_at, status, clients(full_name, phone)')
      .eq('owner_id', ownerId)
      .neq('status', 'cancelled')
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      id: row.id,
      scheduled_at: row.scheduled_at,
      status: row.status,
      client_name: row.clients?.full_name ?? 'Clienta',
      client_phone: row.clients?.phone ?? null,
    }));
  }

  async getLoyaltyAlerts(ownerId: string): Promise<LoyaltyAlertRow[]> {
    const { data, error } = await this.supabase.client
      .from('loyalty_progress')
      .select(
        'client_id, alert_pending, benefit_pending, alert_message, pending_benefit_type, pending_benefit_value, clients(full_name, phone)'
      )
      .eq('owner_id', ownerId)
      .or('alert_pending.eq.true,benefit_pending.eq.true');

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      client_id: row.client_id,
      client_name: row.clients?.full_name ?? 'Clienta',
      client_phone: row.clients?.phone ?? null,
      alert_pending: row.alert_pending,
      benefit_pending: row.benefit_pending,
      alert_message: row.alert_message,
      pending_benefit_type: row.pending_benefit_type,
      pending_benefit_value: row.pending_benefit_value,
    }));
  }

  async getBirthdaysToday(ownerId: string): Promise<BirthdayClient[]> {
    const { data, error } = await this.supabase.client
      .from('clients')
      .select('id, full_name, phone, birth_date')
      .eq('owner_id', ownerId)
      .eq('is_active', true)
      .not('birth_date', 'is', null);

    if (error) throw error;

    const today = new Date();
    return (data ?? [])
      .filter((c: any) => {
        const d = new Date(c.birth_date);
        return d.getUTCMonth() === today.getMonth() && d.getUTCDate() === today.getDate();
      })
      .map((c: any) => ({ id: c.id, full_name: c.full_name, phone: c.phone }));
  }

  async getMonthSummary(ownerId: string, year: number, month: number): Promise<{ count: number; total: number }> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const { data, error } = await this.supabase.client
      .from('appointments')
      .select('total_amount')
      .eq('owner_id', ownerId)
      .eq('status', 'completed')
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString());

    if (error) throw error;

    const rows = data ?? [];
    const total = rows.reduce((sum: number, r: any) => sum + (r.total_amount ?? 0), 0);
    return { count: rows.length, total };
  }
}
