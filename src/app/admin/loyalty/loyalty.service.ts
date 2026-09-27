import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { Database, WhatsappMessageType } from '../../core/models/database.types';

export type LoyaltyProgressRow = Database['public']['Tables']['loyalty_progress']['Row'];
export type LoyaltyRuleRow = Database['public']['Tables']['loyalty_rules']['Row'];

// Port of lib/features/loyalty/data/datasources/loyalty_supabase_datasource.dart.
// The actual cyclical progression logic lives in the update_loyalty_progress
// Postgres trigger (fired when an appointment's status becomes 'completed')
// — this service only reads the state it already computed and logs the
// WhatsApp messages the owner sends manually.
@Injectable({ providedIn: 'root' })
export class LoyaltyService {
  constructor(private readonly supabase: SupabaseService) {}

  async getProgress(ownerId: string, clientId: string): Promise<LoyaltyProgressRow | null> {
    const { data, error } = await this.supabase.client
      .from('loyalty_progress')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('client_id', clientId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async getRules(ownerId: string): Promise<LoyaltyRuleRow[]> {
    const { data, error } = await this.supabase.client
      .from('loyalty_rules')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('is_active', true)
      .order('stage_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async clearAlert(ownerId: string, clientId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('loyalty_progress')
      .update({ alert_pending: false })
      .eq('owner_id', ownerId)
      .eq('client_id', clientId);
    if (error) throw error;
  }

  async logWhatsAppMessage(
    ownerId: string,
    clientId: string,
    phone: string,
    messageType: WhatsappMessageType,
    messageBody: string
  ): Promise<void> {
    const { error } = await this.supabase.client.from('whatsapp_messages').insert({
      owner_id: ownerId,
      client_id: clientId,
      phone,
      message_type: messageType,
      message_body: messageBody,
      method: 'deep_link',
      status: 'sent',
    });
    if (error) throw error;
  }
}
