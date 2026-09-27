import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { AppointmentStatus, Database } from '../../core/models/database.types';

export type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

export interface ClientAppointment extends AppointmentRow {
  client_name: string;
  client_phone: string | null;
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
      .select('*, clients(full_name, phone)')
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
      .select('*, clients(full_name, phone)')
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

  private mapClientAppointment(row: any): ClientAppointment {
    return {
      ...(row as AppointmentRow),
      client_name: row.clients?.full_name ?? 'Clienta',
      client_phone: row.clients?.phone ?? null,
    };
  }

  // SLOT_UNAVAILABLE is raised by admin_create_appointment / the DB exclusion
  // constraint when another appointment already occupies that time range.
  private friendlyError(error: { message: string }): Error {
    if (error.message?.includes('SLOT_UNAVAILABLE')) {
      return new Error('Ese horario ya no está disponible. Elige otra hora.');
    }
    return new Error(error.message);
  }
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Agendada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};
