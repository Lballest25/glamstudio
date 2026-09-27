import { Component } from '@angular/core';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  template: `
    <h1>Clientas</h1>
    <p class="hint">Próximamente: búsqueda, lista con estado de fidelización, alta y edición de clientas (Fase 2).</p>
  `,
  styles: [`.hint { color: var(--color-text-hint); }`],
})
export class ClientsListComponent {}
