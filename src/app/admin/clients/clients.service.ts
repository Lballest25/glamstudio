import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { Database } from '../../core/models/database.types';
import { matchesPerson } from '../../core/utils/search.util';

export type ClientRow = Database['public']['Tables']['clients']['Row'];
export type LoyaltyProgressRow = Database['public']['Tables']['loyalty_progress']['Row'];

export interface ClientInput {
  full_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  notes: string | null;
}

// Port of lib/features/clients/data/datasources/clients_supabase_datasource.dart.
@Injectable({ providedIn: 'root' })
export class ClientsService {
  constructor(private readonly supabase: SupabaseService) {}

  // The search is done here, not with `ilike`, so it ignores accents
  // (see search.util.ts). One owner's active clients is a small list.
  async listClients(ownerId: string, query?: string): Promise<ClientRow[]> {
    const { data, error } = await this.supabase.client
      .from('clients')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('is_active', true)
      .order('full_name', { ascending: true });
    if (error) throw error;

    const clients = data ?? [];
    return query?.trim() ? clients.filter((c) => matchesPerson(c.full_name, c.phone, query)) : clients;
  }

  async getClientById(id: string): Promise<ClientRow | null> {
    const { data, error } = await this.supabase.client.from('clients').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async createClient(ownerId: string, input: ClientInput): Promise<ClientRow> {
    const { data, error } = await this.supabase.client
      .from('clients')
      .insert({ owner_id: ownerId, ...input })
      .select('*')
      .single();
    if (error) throw this.friendlyError(error);
    return data;
  }

  async updateClient(id: string, input: ClientInput): Promise<void> {
    const { error } = await this.supabase.client.from('clients').update(input).eq('id', id);
    if (error) throw this.friendlyError(error);
  }

  async deactivateClient(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('clients').update({ is_active: false }).eq('id', id);
    if (error) throw error;
  }

  async getLoyaltyProgressByClientIds(ownerId: string, clientIds: string[]): Promise<Map<string, LoyaltyProgressRow>> {
    if (clientIds.length === 0) return new Map();
    const { data, error } = await this.supabase.client
      .from('loyalty_progress')
      .select('*')
      .eq('owner_id', ownerId)
      .in('client_id', clientIds);
    if (error) throw error;
    return new Map((data ?? []).map((row) => [row.client_id, row]));
  }

  // clients.phone has a UNIQUE(owner_id, phone) constraint — surface that as
  // a friendly message instead of the raw Postgres error (matches the gap
  // called out in the Flutter app, which let the raw error through).
  private friendlyError(error: { code?: string; message: string }): Error {
    if (error.code === '23505') {
      return new Error('Ya existe una clienta con ese teléfono.');
    }
    return new Error(error.message);
  }
}
