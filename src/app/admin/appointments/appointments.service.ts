import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { Database } from '../../core/models/database.types';

export type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

export interface ClientAppointment extends AppointmentRow {
  client_name: string;
  client_phone: string | null;
  service_names: string[];
}

export interface AppointmentServiceLine {
  service_id: string;
  service_name: string;
  price_at_time: number;
  quantity: number;
}

export interface AppointmentDetail extends AppointmentRow {
  client_name: string;
  client_phone: string | null;
  services: AppointmentServiceLine[];
}

// Port of lib/features/appointments/data/datasources/appointments_supabase_datasource.dart.
// Booking writes go through the atomic admin_create_appointment RPC
// (see glamstudio/supabase/migrations/20260928000000_public_booking_and_rpcs.sql)
// instead of the old two-step insert, so a double-booking is rejected by
// the database's exclusion constraint rather than only warned about client-side.
@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getAppointmentsByMonth(ownerId: string, year: number, month: number): Promise<ClientAppointment[]> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const { data, error } = await this.supabase.client
      .from('appointments')
      .select('*, clients(full_name, phone), appointment_services(services(name))')
      .eq('owner_id', ownerId)
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row: any) => this.mapClientAppointment(row));
  }

  async getClientAppointments(clientId: string): Promise<ClientAppointment[]> {
    const { data, error } = await this.supabase.client
      .from('appointments')
      .select('*, clients(full_name, phone), appointment_services(services(name))')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .order('scheduled_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: any) => this.mapClientAppointment(row));
  }

  async getAppointmentById(id: string): Promise<AppointmentDetail | null> {
    const { data, error } = await this.supabase.client
      .from('appointments')
      .select('*, clients(full_name, phone), appointment_services(service_id, price_at_time, quantity, services(name))')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const row: any = data;
    return {
      ...(row as AppointmentRow),
      client_name: row.clients?.full_name ?? 'Clienta',
      client_phone: row.clients?.phone ?? null,
      services: (row.appointment_services ?? []).map((s: any) => ({
        service_id: s.service_id,
        service_name: s.services?.name ?? 'Servicio',
        price_at_time: s.price_at_time,
        quantity: s.quantity,
      })),
    };
  }

  async createAppointment(
    clientId: string,
    scheduledAt: Date,
    serviceIds: string[],
    notes: string | null
  ): Promise<string> {
    const { data, error } = await this.supabase.client.rpc('admin_create_appointment', {
      p_client_id: clientId,
      p_scheduled_at: scheduledAt.toISOString(),
      p_service_ids: serviceIds,
      p_notes: notes,
    });
    if (error) throw this.friendlyError(error);
    return data as unknown as string;
  }

  async rescheduleAppointment(id: string, scheduledAt: Date): Promise<void> {
    const { error } = await this.supabase.client
      .from('appointments')
      .update({ scheduled_at: scheduledAt.toISOString() })
      .eq('id', id);
    if (error) throw this.friendlyError(error);
  }

  async cancelAppointment(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    if (error) throw error;
  }

  // Atomic replacement for the Flutter app's two separate writes (status
  // update, then a payments insert) — see complete_appointment_and_pay in
  // glamstudio/supabase/migrations/20260928000000_public_booking_and_rpcs.sql.
  // Fires the existing update_loyalty_progress trigger unchanged.
  async completeAppointmentAndPay(params: {
    appointmentId: string;
    discountPct: number;
    subtotal: number;
    totalAmount: number;
    paymentMethod: 'cash' | 'transfer' | 'card';
    paymentReference?: string | null;
    paymentNotes?: string | null;
  }): Promise<void> {
    const { error } = await this.supabase.client.rpc('complete_appointment_and_pay', {
      p_appointment_id: params.appointmentId,
      p_discount_pct: params.discountPct,
      p_subtotal: params.subtotal,
      p_total_amount: params.totalAmount,
      p_payment_method: params.paymentMethod,
      p_payment_reference: params.paymentReference ?? null,
      p_payment_notes: params.paymentNotes ?? null,
    });
    if (error) throw new Error(error.message);
  }

  private mapClientAppointment(row: any): ClientAppointment {
    return {
      ...(row as AppointmentRow),
      client_name: row.clients?.full_name ?? 'Clienta',
      client_phone: row.clients?.phone ?? null,
      service_names: (row.appointment_services ?? []).map((s: any) => s.services?.name).filter(Boolean),
    };
  }

  // SLOT_UNAVAILABLE is raised by admin_create_appointment; a plain UPDATE
  // (reschedule) hits the appointments_no_overlap exclusion constraint
  // directly and surfaces as SQLSTATE 23P01 instead.
  private friendlyError(error: { message: string; code?: string }): Error {
    if (
      error.message?.includes('SLOT_UNAVAILABLE') ||
      error.code === '23P01' ||
      error.message?.includes('appointments_no_overlap')
    ) {
      return new Error('Ese horario se cruza con otra cita. Elige otra hora.');
    }
    return new Error(error.message);
  }
}
