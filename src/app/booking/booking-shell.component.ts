import { Component } from '@angular/core';

@Component({
  selector: 'app-booking-shell',
  standalone: true,
  template: `
    <div class="page">
      <img src="logo.png" alt="GlamStudio" class="logo" />
      <h1>GlamStudio</h1>
      <p>Muy pronto podrás agendar tu cita aquí mismo, elegir tus servicios y ver el resumen de costos. 💅</p>
    </div>
  `,
  styles: [
    `
      .page {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        text-align: center;
        padding: 24px;
        background: var(--color-background);
      }
      .logo {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        object-fit: cover;
      }
      h1 {
        margin: 0;
        color: var(--color-text-primary);
      }
      p {
        color: var(--color-text-secondary);
        max-width: 320px;
      }
    `,
  ],
})
export class BookingShellComponent {}
