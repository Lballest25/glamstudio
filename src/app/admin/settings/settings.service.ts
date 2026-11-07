import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';

export interface WorkingHours {
  start: string;
  end: string;
}

// business_settings is a flexible key/value (JSONB) store — see
// initialize_owner_data() in glamstudio/supabase/migrations/20240101000000_glamstudio_init.sql.
// working_hours is the one key the Flutter app seeded but never exposed an
// editor for; the new public booking portal's slot generator (Fase 5)
// depends on it being accurate, so this is the first UI to read/write it.
export interface RecontactSettings {
  enabled: boolean;
  days: number;
  email: string | null;
}

export interface RecontactTestResult {
  ok: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private readonly supabase: SupabaseService) {}

  // Settings for the every-3-days "Les toca volver" email (Edge Function
  // recontact-digest reads the same business_settings row).
  async getRecontact(ownerId: string): Promise<RecontactSettings> {
    const { data, error } = await this.supabase.client
      .from('business_settings')
      .select('value')
      .eq('owner_id', ownerId)
      .eq('key', 'recontact')
      .maybeSingle();
    if (error) throw error;
    const v = (data?.value ?? {}) as Partial<RecontactSettings>;
    return { enabled: v.enabled ?? true, days: v.days ?? 21, email: v.email ?? null };
  }

  async setRecontact(ownerId: string, value: RecontactSettings): Promise<void> {
    const { error } = await this.supabase.client
      .from('business_settings')
      .upsert(
        { owner_id: ownerId, key: 'recontact', value: { ...value, every_days: 3 } },
        { onConflict: 'owner_id,key' }
      );
    if (error) throw error;
  }

  async sendRecontactTest(): Promise<RecontactTestResult> {
    const { data, error } = await this.supabase.client.functions.invoke('recontact-digest', { body: {} });
    if (error) {
      const status = (error as any).context?.status;
      if (status === 404) return { ok: false, message: 'La función aún no está instalada en Supabase.' };
      let detail = '';
      try {
        detail = (await (error as any).context.json())?.error ?? '';
      } catch {
        /* no body */
      }
      return { ok: false, message: detail || 'No se pudo enviar el aviso de prueba.' };
    }
    if (data?.sent) return { ok: true, message: `Aviso enviado a ${data.to}` };
    return { ok: true, message: 'Ninguna clienta cumple ese tiempo todavía, no hay nada que avisar.' };
  }

  async getWorkingHours(ownerId: string): Promise<WorkingHours> {
    const { data, error } = await this.supabase.client
      .from('business_settings')
      .select('value')
      .eq('owner_id', ownerId)
      .eq('key', 'working_hours')
      .maybeSingle();
    if (error) throw error;
    return (data?.value as WorkingHours | undefined) ?? { start: '09:00', end: '20:00' };
  }

  async setWorkingHours(ownerId: string, hours: WorkingHours): Promise<void> {
    const { error } = await this.supabase.client
      .from('business_settings')
      .upsert({ owner_id: ownerId, key: 'working_hours', value: hours }, { onConflict: 'owner_id,key' });
    if (error) throw error;
  }
}
