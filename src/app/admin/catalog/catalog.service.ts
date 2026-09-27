import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { Database, ServiceCategory } from '../../core/models/database.types';

export type ServiceRow = Database['public']['Tables']['services']['Row'];

export interface ServiceInput {
  name: string;
  description: string | null;
  category: ServiceCategory;
  base_price: number;
  duration_min: number;
}

// Port of lib/features/services/data/datasources/services_supabase_datasource.dart.
// In Flutter this catalog is managed from the Settings screen; here it gets
// its own admin section (renamed "catalog" to avoid the Angular-service
// naming clash with services.name).
@Injectable({ providedIn: 'root' })
export class CatalogService {
  constructor(private readonly supabase: SupabaseService) {}

  async getAllServices(ownerId: string): Promise<ServiceRow[]> {
    const { data, error } = await this.supabase.client
      .from('services')
      .select('*')
      .eq('owner_id', ownerId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createService(ownerId: string, input: ServiceInput): Promise<void> {
    const { error } = await this.supabase.client.from('services').insert({
      owner_id: ownerId,
      name: input.name,
      description: input.description,
      category: input.category,
      base_price: input.base_price,
      duration_min: input.duration_min,
    });
    if (error) throw error;
  }

  async updateService(id: string, input: ServiceInput): Promise<void> {
    const { error } = await this.supabase.client
      .from('services')
      .update({
        name: input.name,
        description: input.description,
        category: input.category,
        base_price: input.base_price,
        duration_min: input.duration_min,
      })
      .eq('id', id);
    if (error) throw error;
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await this.supabase.client.from('services').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  }
}
