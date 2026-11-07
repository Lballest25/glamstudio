import { Injectable, inject } from '@angular/core';
import { Database, PhotoKind } from '../../core/models/database.types';
import { SupabaseService } from '../../core/services/supabase.service';
import { compressImage } from '../../core/utils/image.util';

export type PhotoRow = Database['public']['Tables']['client_photos']['Row'];

export interface PhotoView {
  row: PhotoRow;
  thumbUrl: string | null;
}

const BUCKET = 'client-photos';
const URL_TTL = 60 * 60;

// Photos live in a PRIVATE bucket: they're shown through temporary signed
// URLs, so a leaked link stops working after an hour.
@Injectable({ providedIn: 'root' })
export class ClientPhotosService {
  private readonly supabase = inject(SupabaseService);

  async list(clientId: string): Promise<PhotoView[]> {
    const { data, error } = await this.supabase.client
      .from('client_photos')
      .select('*')
      .eq('client_id', clientId)
      .order('taken_on', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    const paths = rows.map((r) => r.thumb_path ?? r.storage_path);
    const urls = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed } = await this.supabase.client.storage.from(BUCKET).createSignedUrls(paths, URL_TTL);
      for (const item of signed ?? []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    }
    return rows.map((row) => ({ row, thumbUrl: urls.get(row.thumb_path ?? row.storage_path) ?? null }));
  }

  async fullUrl(path: string): Promise<string | null> {
    const { data } = await this.supabase.client.storage.from(BUCKET).createSignedUrl(path, URL_TTL);
    return data?.signedUrl ?? null;
  }

  async upload(params: {
    ownerId: string;
    clientId: string;
    file: File;
    kind: PhotoKind;
    takenOn: string;
    caption: string | null;
  }): Promise<void> {
    const [full, thumb] = await Promise.all([compressImage(params.file, 1600, 0.82), compressImage(params.file, 480, 0.75)]);

    const id = crypto.randomUUID();
    const base = `${params.ownerId}/${params.clientId}/${id}`;
    const fullPath = `${base}.jpg`;
    const thumbPath = `${base}-thumb.jpg`;
    const storage = this.supabase.client.storage.from(BUCKET);

    const up1 = await storage.upload(fullPath, full, { contentType: 'image/jpeg' });
    if (up1.error) throw up1.error;
    const up2 = await storage.upload(thumbPath, thumb, { contentType: 'image/jpeg' });
    if (up2.error) {
      await storage.remove([fullPath]);
      throw up2.error;
    }

    const { error } = await this.supabase.client.from('client_photos').insert({
      owner_id: params.ownerId,
      client_id: params.clientId,
      kind: params.kind,
      storage_path: fullPath,
      thumb_path: thumbPath,
      caption: params.caption,
      taken_on: params.takenOn,
    });
    if (error) {
      await storage.remove([fullPath, thumbPath]);
      throw error;
    }
  }

  async remove(photo: PhotoRow): Promise<void> {
    const paths = [photo.storage_path, photo.thumb_path].filter((p): p is string => !!p);
    const { error } = await this.supabase.client.from('client_photos').delete().eq('id', photo.id);
    if (error) throw error;
    await this.supabase.client.storage.from(BUCKET).remove(paths);
  }
}
