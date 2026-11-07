import { Injectable, inject } from '@angular/core';
import { Database } from '../../core/models/database.types';
import { SupabaseService } from '../../core/services/supabase.service';

export type ReferralCredit = Database['public']['Tables']['referral_credits']['Row'];

export interface ReferralFriend {
  id: string;
  full_name: string;
  completedFirstVisit: boolean;
}

export interface ReferralSummary {
  referredBy: { id: string; full_name: string } | null;
  friends: ReferralFriend[];
  credits: ReferralCredit[];
}

export interface EarnedCredit {
  role: 'referrer' | 'referred';
  holderName: string;
  discountPct: number;
}

// Referral rules live in the database (see 20261110000000_referrals.sql): the
// credits are created by a trigger when the referred client completes her
// first visit, and consumed atomically by complete_appointment_and_pay.
// Every method here fails soft — if the migration isn't applied yet the
// feature simply shows nothing.
@Injectable({ providedIn: 'root' })
export class ReferralsService {
  private readonly supabase = inject(SupabaseService);

  // Oldest unexpired credit first, so they are used in the order they were earned.
  async getAvailableCredit(clientId: string): Promise<ReferralCredit | null> {
    const { data, error } = await this.supabase.client
      .from('referral_credits')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'available')
      .gt('expires_at', new Date().toISOString())
      .order('earned_at', { ascending: true })
      .limit(1);
    if (error) return null;
    return data?.[0] ?? null;
  }

  async getSummary(clientId: string, referredById: string | null): Promise<ReferralSummary> {
    const empty: ReferralSummary = { referredBy: null, friends: [], credits: [] };
    try {
      const [referrer, friendsRes, creditsRes] = await Promise.all([
        referredById
          ? this.supabase.client.from('clients').select('id, full_name').eq('id', referredById).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        this.supabase.client.from('clients').select('id, full_name').eq('referred_by', clientId).order('created_at'),
        this.supabase.client
          .from('referral_credits')
          .select('*')
          .eq('client_id', clientId)
          .order('earned_at', { ascending: false })
          .limit(20),
      ]);
      if (friendsRes.error || creditsRes.error) return empty;

      const friends = friendsRes.data ?? [];
      const completed = new Set<string>();
      if (friends.length > 0) {
        const { data } = await this.supabase.client
          .from('appointments')
          .select('client_id')
          .eq('status', 'completed')
          .in('client_id', friends.map((f) => f.id));
        for (const row of data ?? []) completed.add(row.client_id);
      }

      return {
        referredBy: referrer.data ?? null,
        friends: friends.map((f) => ({ ...f, completedFirstVisit: completed.has(f.id) })),
        credits: creditsRes.data ?? [],
      };
    } catch {
      return empty;
    }
  }

  // Credits created because `friendId` just completed her first visit — used
  // to tell the owner who just earned a discount.
  async creditsEarnedFrom(friendId: string): Promise<EarnedCredit[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('referral_credits')
        .select('role, client_id, discount_pct')
        .eq('referral_client_id', friendId);
      if (error || !data?.length) return [];

      const { data: names } = await this.supabase.client
        .from('clients')
        .select('id, full_name')
        .in('id', data.map((c) => c.client_id));
      const byId = new Map((names ?? []).map((n) => [n.id, n.full_name]));
      return data.map((c) => ({
        role: c.role,
        holderName: byId.get(c.client_id) ?? 'Clienta',
        discountPct: c.discount_pct,
      }));
    } catch {
      return [];
    }
  }
}
