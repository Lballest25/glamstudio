import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { ClientRow, ClientsService } from './clients.service';

export interface OverdueClient {
  client: ClientRow;
  lastVisit: Date;
  daysSince: number;
  visits: number;
  lastContactedAt: Date | null;
}

const DAY_MS = 86_400_000;
const PAGE = 1000;

// "Les toca volver": clients whose last completed visit is at least N days
// ago and who have nothing booked ahead. "Contactada" comes from the
// whatsapp_messages log (type 'manual') written when the owner taps the button.
@Injectable({ providedIn: 'root' })
export class RecontactService {
  private readonly supabase = inject(SupabaseService);
  private readonly clientsService = inject(ClientsService);

  async getOverdue(ownerId: string, minDays: number): Promise<OverdueClient[]> {
    const [clients, completed, upcoming, contacts] = await Promise.all([
      this.clientsService.listClients(ownerId),
      this.completedVisits(ownerId),
      this.upcomingClientIds(ownerId),
      this.lastManualContacts(ownerId),
    ]);

    const lastVisit = new Map<string, Date>();
    const visits = new Map<string, number>();
    for (const row of completed) {
      visits.set(row.client_id, (visits.get(row.client_id) ?? 0) + 1);
      const date = new Date(row.scheduled_at);
      const prev = lastVisit.get(row.client_id);
      if (!prev || date > prev) lastVisit.set(row.client_id, date);
    }

    const now = Date.now();
    const result: OverdueClient[] = [];
    for (const client of clients) {
      const last = lastVisit.get(client.id);
      if (!last || upcoming.has(client.id)) continue;
      const daysSince = Math.floor((now - last.getTime()) / DAY_MS);
      if (daysSince < minDays) continue;
      result.push({
        client,
        lastVisit: last,
        daysSince,
        visits: visits.get(client.id) ?? 1,
        lastContactedAt: contacts.get(client.id) ?? null,
      });
    }
    // Recently lapsed first: they're the likeliest to come back.
    return result.sort((a, b) => a.daysSince - b.daysSince);
  }

  private async completedVisits(ownerId: string): Promise<{ client_id: string; scheduled_at: string }[]> {
    const rows: { client_id: string; scheduled_at: string }[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.supabase.client
        .from('appointments')
        .select('client_id, scheduled_at')
        .eq('owner_id', ownerId)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) return rows;
    }
  }

  private async upcomingClientIds(ownerId: string): Promise<Set<string>> {
    const { data, error } = await this.supabase.client
      .from('appointments')
      .select('client_id')
      .eq('owner_id', ownerId)
      .in('status', ['scheduled', 'in_progress'])
      .gte('scheduled_at', new Date().toISOString());
    if (error) throw error;
    return new Set((data ?? []).map((r) => r.client_id));
  }

  private async lastManualContacts(ownerId: string): Promise<Map<string, Date>> {
    const { data, error } = await this.supabase.client
      .from('whatsapp_messages')
      .select('client_id, sent_at')
      .eq('owner_id', ownerId)
      .eq('message_type', 'manual')
      .order('sent_at', { ascending: false })
      .limit(1000);
    if (error) return new Map();
    const map = new Map<string, Date>();
    for (const row of data ?? []) if (!map.has(row.client_id)) map.set(row.client_id, new Date(row.sent_at));
    return map;
  }
}
