import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ClientRow, ClientsService } from './clients.service';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (client(); as client) {
      <div class="page-header">
        <h1>{{ client.full_name }}</h1>
      </div>

      <div class="card" style="max-width: 480px; margin-bottom: 16px;">
        @if (client.phone) {
          <p><strong>Teléfono:</strong> {{ client.phone }}</p>
        }
        @if (client.email) {
          <p><strong>Email:</strong> {{ client.email }}</p>
        }
        @if (client.birth_date) {
          <p><strong>Cumpleaños:</strong> {{ client.birth_date }}</p>
        }
        @if (client.notes) {
          <p><strong>Notas:</strong> {{ client.notes }}</p>
        }
      </div>

      <div style="display:flex; gap:8px; flex-wrap: wrap;">
        <a class="btn" [routerLink]="['/admin/clientas', client.id, 'editar']">Editar</a>
        <a class="btn" [routerLink]="['/admin/clientas', client.id, 'historial']">Ver historial</a>
        <a class="btn btn-primary" [routerLink]="['/admin/citas/nueva']" [queryParams]="{ clientId: client.id }">
          + Nueva cita
        </a>
      </div>
    } @else if (loading()) {
      <p class="hint">Cargando…</p>
    } @else {
      <p class="empty-state">No se encontró la clienta.</p>
    }
  `,
})
export class ClientDetailComponent implements OnInit {
  loading = signal(true);
  client = signal<ClientRow | null>(null);

  constructor(private readonly route: ActivatedRoute, private readonly clientsService: ClientsService) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.client.set(await this.clientsService.getClientById(id));
    }
    this.loading.set(false);
  }
}
