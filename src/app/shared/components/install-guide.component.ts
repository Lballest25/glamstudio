import { Component, inject } from '@angular/core';
import { InstallService } from '../../core/services/install.service';
import { IconComponent } from './icon.component';

// "Add to home screen" help, shared by Ajustes (studio) and /agendar (clients).
@Component({
  selector: 'app-install-guide',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (install.installed()) {
      <p class="hint">
        <app-icon name="check-circle" [size]="14" style="vertical-align: -2px" />
        Ya la estás usando como app.
      </p>
    } @else if (install.canPrompt()) {
      <button type="button" class="btn btn-primary" style="align-self: flex-start" (click)="install.prompt()">
        <app-icon name="download" [size]="17" />
        Instalar app
      </button>
    } @else if (install.isIos) {
      <ol class="steps">
        <li>Abre esta página en <strong>Safari</strong>.</li>
        <li>Toca el botón <strong>Compartir</strong> (el cuadrado con la flecha hacia arriba).</li>
        <li>Elige <strong>Añadir a pantalla de inicio</strong>.</li>
      </ol>
    } @else {
      <ol class="steps">
        <li>Abre el menú del navegador (los tres puntos).</li>
        <li>Elige <strong>Instalar app</strong> o <strong>Añadir a pantalla de inicio</strong>.</li>
      </ol>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .hint {
        color: var(--c-text-3);
        font-size: 13px;
      }
      .steps {
        margin: 0;
        padding-left: 20px;
        color: var(--c-text-2);
        font-size: 14px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
    `,
  ],
})
export class InstallGuideComponent {
  readonly install = inject(InstallService);
}
