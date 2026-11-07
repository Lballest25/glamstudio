import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PhotoKind } from '../../core/models/database.types';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { formatDateMedium, parseISODate, plural, toLocalISODate } from '../../core/utils/format.util';
import { IconComponent } from '../../shared/components/icon.component';
import { SheetComponent } from '../../shared/components/sheet.component';
import { ClientPhotosService, PhotoView } from './client-photos.service';
import { ClientsService } from './clients.service';

const KIND_LABEL: Record<PhotoKind, string> = { before: 'Antes', after: 'Después', other: 'Otra' };
const KIND_BADGE: Record<PhotoKind, string> = { before: 'badge-info', after: 'badge-success', other: '' };

@Component({
  selector: 'app-client-photos',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, SheetComponent],
  template: `
    <div class="page page-narrow fade-in">
      <a class="back-link" [routerLink]="['/admin/clientas', clientId]">
        <app-icon name="arrow-left" [size]="18" />
        Perfil
      </a>

      <header class="page-header">
        <div>
          <h1>Fotos</h1>
          <p class="page-subtitle">{{ clientName() }} · {{ plural(photos().length, 'foto') }}</p>
        </div>
        @if (!unavailable()) {
          <button type="button" class="btn btn-primary" (click)="openUpload()">
            <app-icon name="camera" [size]="18" />
            Agregar fotos
          </button>
        }
      </header>

      @if (loading()) {
        <div class="grid-photos">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <span class="skeleton" style="aspect-ratio: 1; border-radius: 14px"></span>
          }
        </div>
      } @else if (unavailable()) {
        <div class="card empty">
          <span class="empty-icon"><app-icon name="image" [size]="26" /></span>
          <span class="empty-title">Las fotos aún no están activadas</span>
          <span>Falta aplicar la última actualización de la base de datos en Supabase.</span>
        </div>
      } @else if (photos().length === 0) {
        <div class="card empty">
          <span class="empty-icon"><app-icon name="camera" [size]="26" /></span>
          <span class="empty-title">Aún no hay fotos</span>
          <span>Guarda el antes y el después de cada servicio para ver su evolución.</span>
          <button type="button" class="btn btn-soft btn-sm" (click)="openUpload()">
            <app-icon name="camera" [size]="16" />
            Agregar la primera
          </button>
        </div>
      } @else {
        @for (group of groups(); track group.date) {
          <section class="stack" style="gap: 10px">
            <p class="section-title">{{ formatDate(group.date) }}</p>
            <div class="grid-photos">
              @for (p of group.items; track p.row.id) {
                <button type="button" class="thumb" (click)="openPhoto(p)" [attr.aria-label]="'Ver foto ' + kindLabel(p.row.kind)">
                  @if (p.thumbUrl) {
                    <img [src]="p.thumbUrl" alt="" loading="lazy" />
                  }
                  <span [class]="'badge ' + kindBadge(p.row.kind)">{{ kindLabel(p.row.kind) }}</span>
                </button>
              }
            </div>
          </section>
        }
      }
    </div>

    <app-sheet [open]="uploadOpen()" title="Agregar fotos" (closed)="closeUpload()">
      <div class="stack">
        <div class="segmented" role="radiogroup" aria-label="Tipo de foto">
          @for (k of kinds; track k) {
            <button type="button" role="radio" [attr.aria-checked]="kind() === k" [class.is-active]="kind() === k" (click)="kind.set(k)">
              {{ kindLabel(k) }}
            </button>
          }
        </div>

        <label class="field">
          <span class="field-label">Fecha</span>
          <input class="input" type="date" [(ngModel)]="takenOn" />
        </label>

        <label class="field">
          <span class="field-label">Nota <span class="optional">(opcional)</span></span>
          <input class="input" [(ngModel)]="caption" placeholder="Ej. Volumen ruso 0.07" />
        </label>

        <label class="picker">
          <input type="file" accept="image/*" multiple (change)="onFiles($event)" [disabled]="uploading()" />
          <span class="picker-body">
            <app-icon name="upload" [size]="22" />
            <strong>{{ files().length ? plural(files().length, 'foto elegida', 'fotos elegidas') : 'Elegir fotos o tomar una' }}</strong>
            <span class="subtle small">Se reducen automáticamente para ahorrar espacio</span>
          </span>
        </label>

        @if (uploading()) {
          <div class="progress"><span [style.width.%]="(done() / files().length) * 100"></span></div>
          <p class="subtle small" style="text-align: center">Subiendo {{ done() + 1 > files().length ? files().length : done() + 1 }} de {{ files().length }}…</p>
        }

        <button type="button" class="btn btn-primary btn-lg btn-block" [disabled]="uploading() || files().length === 0" (click)="upload()">
          @if (uploading()) {
            <span class="spinner"></span>
          }
          Guardar {{ files().length > 1 ? 'fotos' : 'foto' }}
        </button>
      </div>
    </app-sheet>

    <app-sheet [open]="!!viewing()" [title]="viewingTitle()" (closed)="viewing.set(null)">
      @if (viewing(); as v) {
        <div class="stack">
          @if (fullUrl()) {
            <img [src]="fullUrl()" alt="Foto de la clienta" class="full" />
          } @else {
            <span class="skeleton" style="aspect-ratio: 4 / 5; border-radius: 14px"></span>
          }
          @if (v.row.caption) {
            <p class="muted">{{ v.row.caption }}</p>
          }
          <div class="row row-wrap">
            @if (fullUrl()) {
              <a class="btn" [href]="fullUrl()" target="_blank" rel="noopener">
                <app-icon name="external-link" [size]="17" />
                Abrir
              </a>
            }
            <button type="button" class="btn btn-danger" [disabled]="deleting()" (click)="remove(v)">
              <app-icon name="trash" [size]="17" />
              Eliminar
            </button>
          </div>
        </div>
      }
    </app-sheet>
  `,
  styles: [
    `
      .grid-photos {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
        gap: 8px;
      }
      .thumb {
        position: relative;
        aspect-ratio: 1;
        padding: 0;
        border: 0;
        border-radius: var(--r-md);
        overflow: hidden;
        background: var(--c-surface-3);
        cursor: pointer;
      }
      .thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .thumb .badge {
        position: absolute;
        left: 6px;
        bottom: 6px;
        height: 22px;
        font-size: 11px;
        background: rgba(255, 255, 255, 0.92);
      }
      .picker {
        display: block;
        position: relative;
        cursor: pointer;
      }
      .picker input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
        width: 100%;
        height: 100%;
      }
      .picker-body {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 22px 16px;
        text-align: center;
        border: 2px dashed var(--c-border-strong);
        border-radius: var(--r-lg);
        background: var(--c-surface-2);
        color: var(--c-primary);
      }
      .picker-body strong {
        color: var(--c-text);
      }
      .picker:hover .picker-body {
        border-color: var(--c-primary);
        background: var(--c-primary-soft);
      }
      .full {
        width: 100%;
        max-height: 62dvh;
        object-fit: contain;
        border-radius: var(--r-md);
        background: var(--c-surface-3);
      }
    `,
  ],
})
export class ClientPhotosComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly photosService = inject(ClientPhotosService);
  private readonly clientsService = inject(ClientsService);
  private readonly toast = inject(ToastService);

  readonly kinds: PhotoKind[] = ['before', 'after', 'other'];
  clientId = this.route.snapshot.paramMap.get('id') ?? '';

  loading = signal(true);
  unavailable = signal(false);
  clientName = signal('');
  photos = signal<PhotoView[]>([]);
  groups = computed(() => {
    const map = new Map<string, PhotoView[]>();
    for (const p of this.photos()) {
      if (!map.has(p.row.taken_on)) map.set(p.row.taken_on, []);
      map.get(p.row.taken_on)!.push(p);
    }
    return [...map.entries()].map(([date, items]) => ({ date, items }));
  });

  uploadOpen = signal(false);
  uploading = signal(false);
  done = signal(0);
  files = signal<File[]>([]);
  kind = signal<PhotoKind>('before');
  takenOn = toLocalISODate(new Date());
  caption = '';

  viewing = signal<PhotoView | null>(null);
  fullUrl = signal<string | null>(null);
  deleting = signal(false);
  viewingTitle = computed(() => {
    const v = this.viewing();
    return v ? `${KIND_LABEL[v.row.kind]} · ${formatDateMedium(parseISODate(v.row.taken_on))}` : '';
  });

  plural = plural;

  async ngOnInit() {
    const [client] = await Promise.all([this.clientsService.getClientById(this.clientId), this.reload()]);
    this.clientName.set(client?.full_name ?? '');
  }

  kindLabel(kind: PhotoKind): string {
    return KIND_LABEL[kind];
  }

  kindBadge(kind: PhotoKind): string {
    return KIND_BADGE[kind];
  }

  formatDate(iso: string): string {
    return formatDateMedium(parseISODate(iso));
  }

  private async reload() {
    try {
      this.photos.set(await this.photosService.list(this.clientId));
      this.unavailable.set(false);
    } catch {
      // The client_photos table doesn't exist until the 20261108 migration runs.
      this.unavailable.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  openUpload() {
    this.files.set([]);
    this.caption = '';
    this.takenOn = toLocalISODate(new Date());
    this.uploadOpen.set(true);
  }

  closeUpload() {
    if (!this.uploading()) this.uploadOpen.set(false);
  }

  onFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    this.files.set(Array.from(input.files ?? []).filter((f) => f.type.startsWith('image/')));
  }

  async upload() {
    const ownerId = this.auth.currentUser()?.id;
    const files = this.files();
    if (!ownerId || files.length === 0) return;

    this.uploading.set(true);
    this.done.set(0);
    let failed = 0;
    for (const file of files) {
      try {
        await this.photosService.upload({
          ownerId,
          clientId: this.clientId,
          file,
          kind: this.kind(),
          takenOn: this.takenOn,
          caption: this.caption.trim() || null,
        });
      } catch {
        failed++;
      }
      this.done.update((n) => n + 1);
    }
    this.uploading.set(false);
    this.uploadOpen.set(false);

    if (failed === 0) this.toast.success(files.length === 1 ? 'Foto guardada' : `${files.length} fotos guardadas`);
    else this.toast.error(`No se pudieron subir ${failed} de ${files.length} fotos.`);
    await this.reload();
  }

  async openPhoto(photo: PhotoView) {
    this.viewing.set(photo);
    this.fullUrl.set(null);
    const url = await this.photosService.fullUrl(photo.row.storage_path);
    if (this.viewing()?.row.id === photo.row.id) this.fullUrl.set(url);
  }

  async remove(photo: PhotoView) {
    if (!confirm('¿Eliminar esta foto? No se puede recuperar.')) return;
    this.deleting.set(true);
    try {
      await this.photosService.remove(photo.row);
      this.viewing.set(null);
      this.toast.success('Foto eliminada');
      await this.reload();
    } catch {
      this.toast.error('No se pudo eliminar la foto.');
    } finally {
      this.deleting.set(false);
    }
  }
}
