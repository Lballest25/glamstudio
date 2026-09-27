import { Component } from '@angular/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
    <h1>Configuración</h1>
    <p class="hint">Próximamente: catálogo de servicios y horario de atención (Fase 4).</p>
  `,
  styles: [`.hint { color: var(--color-text-hint); }`],
})
export class SettingsComponent {}
