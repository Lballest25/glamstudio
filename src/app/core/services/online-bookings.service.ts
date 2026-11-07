import { Injectable, effect, inject, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

export interface OnlineBooking {
  id: string;
  scheduled_at: string;
  created_at: string;
  client_name: string;
  client_phone: string | null;
  service_names: string[];
}

// Bookings made by clients through /agendar that the owner hasn't opened yet.
// Updates live (Supabase Realtime) while the panel is open, and again when
// the tab becomes visible, since phones suspend background sockets.
@Injectable({ providedIn: 'root' })
export class OnlineBookingsService {
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);

  readonly unseen = signal<OnlineBooking[]>([]);
  // False until the 20261108 migration (appointments.source) is applied.
  readonly available = signal(true);

  private ownerId: string | null = null;
  private channel: RealtimeChannel | null = null;
  private baseTitle = '';
  private readonly onVisible = () => {
    if (document.visibilityState === 'visible') void this.refresh(false);
  };

  constructor() {
    effect(() => {
      const count = this.unseen().length;
      if (!this.baseTitle) return;
      document.title = count > 0 ? `(${count}) ${this.baseTitle}` : this.baseTitle;
    });
  }

  async start(ownerId: string) {
    if (this.ownerId === ownerId && this.channel) return;
    this.stop();
    this.ownerId = ownerId;
    this.baseTitle = document.title.replace(/^\(\d+\)\s*/, '');
    await this.refresh(false);
    if (!this.available()) return;

    this.channel = this.supabase.client
      .channel(`online-bookings-${ownerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `owner_id=eq.${ownerId}` },
        () => void this.refresh(true)
      )
      .subscribe();
    document.addEventListener('visibilitychange', this.onVisible);
  }

  stop() {
    if (this.channel) void this.supabase.client.removeChannel(this.channel);
    this.channel = null;
    this.ownerId = null;
    this.unseen.set([]);
    document.removeEventListener('visibilitychange', this.onVisible);
    if (this.baseTitle) document.title = this.baseTitle;
  }

  async refresh(announceNew: boolean) {
    if (!this.ownerId) return;
    const { data, error } = await this.supabase.client
      .from('appointments')
      .select('id, scheduled_at, created_at, clients(full_name, phone), appointment_services(services(name))')
      .eq('owner_id', this.ownerId)
      .eq('source', 'online')
      .is('acknowledged_at', null)
      .eq('status', 'scheduled')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      // Column doesn't exist yet: feature stays off, nothing else breaks.
      this.available.set(false);
      return;
    }

    const next: OnlineBooking[] = (data ?? []).map((row: any) => ({
      id: row.id,
      scheduled_at: row.scheduled_at,
      created_at: row.created_at,
      client_name: row.clients?.full_name ?? 'Clienta',
      client_phone: row.clients?.phone ?? null,
      service_names: (row.appointment_services ?? []).map((s: any) => s.services?.name).filter(Boolean),
    }));

    if (announceNew) {
      const known = new Set(this.unseen().map((b) => b.id));
      const fresh = next.filter((b) => !known.has(b.id));
      if (fresh.length === 1) this.toast.success(`Nueva reserva de ${fresh[0].client_name}`);
      else if (fresh.length > 1) this.toast.success(`${fresh.length} reservas nuevas`);
    }
    this.unseen.set(next);
  }

  async markSeen(id: string) {
    this.unseen.update((list) => list.filter((b) => b.id !== id));
    await this.supabase.client
      .from('appointments')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', id)
      .is('acknowledged_at', null);
  }

  async markAllSeen() {
    const ids = this.unseen().map((b) => b.id);
    if (ids.length === 0) return;
    this.unseen.set([]);
    await this.supabase.client
      .from('appointments')
      .update({ acknowledged_at: new Date().toISOString() })
      .in('id', ids);
  }
}
