import { Injectable } from '@angular/core';
import { SupabaseService } from '../core/services/supabase.service';

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  category: string;
  base_price: number;
  duration_min: number;
  sort_order: number;
}

export interface BookingResult {
  appointmentId: string;
  scheduledAt: string;
  subtotal: number;
  hasPendingBenefit: boolean;
}

// Wraps the four public_* RPCs added in
// glamstudio/supabase/migrations/20260928000000_public_booking_and_rpcs.sql.
// These are the ONLY write/read paths available to an unauthenticated
// visitor — there is no direct table access for the anon role, by design
// (see the migration's grants section), so every booking-portal action
// must go through one of these functions.
@Injectable({ providedIn: 'root' })
export class BookingService {
  constructor(private readonly supabase: SupabaseService) {}

  async listServices(): Promise<PublicService[]> {
    const { data, error } = await this.supabase.client.rpc('public_list_services');
    if (error) throw error;
    return (data ?? []) as unknown as PublicService[];
  }

  async getAvailableSlots(date: string, serviceIds: string[]): Promise<string[]> {
    const { data, error } = await this.supabase.client.rpc('public_get_available_slots', {
      p_date: date,
      p_service_ids: serviceIds,
    });
    if (error) throw error;
    return (data ?? []).map((row: any) => row.slot_start as string);
  }

  async checkPhoneBenefit(phone: string): Promise<boolean> {
    const { data, error } = await this.supabase.client.rpc('public_check_phone_benefit', { p_phone: phone });
    if (error) throw error;
    return !!data;
  }

  async createBooking(params: {
    clientName: string;
    clientPhone: string;
    clientEmail: string | null;
    scheduledAt: string;
    serviceIds: string[];
  }): Promise<BookingResult> {
    const { data, error } = await this.supabase.client.rpc('public_create_booking', {
      p_client_name: params.clientName,
      p_client_phone: params.clientPhone,
      p_client_email: params.clientEmail,
      p_scheduled_at: params.scheduledAt,
      p_service_ids: params.serviceIds,
    });
    if (error) throw this.friendlyError(error);

    const row = (Array.isArray(data) ? data[0] : data) as any;
    return {
      appointmentId: row.appointment_id,
      scheduledAt: row.scheduled_at,
      subtotal: row.subtotal,
      hasPendingBenefit: row.has_pending_benefit,
    };
  }

  private friendlyError(error: { message: string }): Error {
    if (error.message?.includes('SLOT_UNAVAILABLE')) {
      return new Error('Ese horario ya no está disponible. Por favor elige otro.');
    }
    if (error.message?.includes('PHONE_REQUIRED')) {
      return new Error('Ingresa tu número de teléfono.');
    }
    if (error.message?.includes('NO_SERVICES_SELECTED') || error.message?.includes('INVALID_SERVICES')) {
      return new Error('Selecciona al menos un servicio válido.');
    }
    return new Error('No se pudo agendar la cita. Intenta de nuevo.');
  }
}
