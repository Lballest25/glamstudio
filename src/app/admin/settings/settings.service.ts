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
@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private readonly supabase: SupabaseService) {}

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
