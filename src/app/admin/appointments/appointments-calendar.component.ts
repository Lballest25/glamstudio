import { Component } from '@angular/core';

@Component({
  selector: 'app-appointments-calendar',
  standalone: true,
  template: `
    <h1>Citas</h1>
    <p class="hint">Próximamente: calendario mensual, nueva cita, completar y cobrar (Fase 2 y 3).</p>
  `,
  styles: [`.hint { color: var(--color-text-hint); }`],
})
export class AppointmentsCalendarComponent {}
