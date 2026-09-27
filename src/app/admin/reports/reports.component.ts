import { Component } from '@angular/core';

@Component({
  selector: 'app-reports',
  standalone: true,
  template: `
    <h1>Reportes</h1>
    <p class="hint">Próximamente: ingresos, top servicios, top clientas y gastos (Fase 4).</p>
  `,
  styles: [`.hint { color: var(--color-text-hint); }`],
})
export class ReportsComponent {}
