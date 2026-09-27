import { Component, OnDestroy, effect, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

// Bottom sheet on phones, centered dialog on larger screens.
@Component({
  selector: 'app-sheet',
  standalone: true,
  imports: [IconComponent],
  host: { '(document:keydown.escape)': 'onEscape()' },
  template: `
    @if (open()) {
      <div class="backdrop" (click)="closed.emit()"></div>
      <section class="panel" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <div class="handle" aria-hidden="true"></div>
        <header class="head">
          <h2>{{ title() }}</h2>
          <button type="button" class="btn btn-ghost btn-icon" (click)="closed.emit()" aria-label="Cerrar">
            <app-icon name="x" [size]="20" />
          </button>
        </header>
        <div class="body">
          <ng-content />
        </div>
      </section>
    }
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 60;
        background: rgba(36, 23, 51, 0.42);
        backdrop-filter: blur(2px);
        animation: fade 0.2s ease both;
      }
      .panel {
        position: fixed;
        z-index: 61;
        left: 0;
        right: 0;
        bottom: 0;
        max-height: 92dvh;
        overflow-y: auto;
        background: var(--c-surface);
        border-radius: var(--r-xl) var(--r-xl) 0 0;
        padding: 8px 20px calc(24px + env(safe-area-inset-bottom));
        box-shadow: var(--sh-lg);
        animation: slide-up 0.28s cubic-bezier(0.2, 1, 0.4, 1) both;
      }
      .handle {
        width: 40px;
        height: 5px;
        border-radius: 999px;
        background: var(--c-border-strong);
        margin: 4px auto 8px;
      }
      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .head h2 {
        font-family: var(--f-display);
        font-weight: 600;
        font-size: 22px;
      }
      @media (min-width: 720px) {
        .panel {
          left: 50%;
          top: 50%;
          bottom: auto;
          right: auto;
          width: min(520px, calc(100vw - 32px));
          transform: translate(-50%, -50%);
          border-radius: var(--r-xl);
          padding: 20px 24px 24px;
          animation: pop 0.22s cubic-bezier(0.2, 1, 0.4, 1) both;
        }
        .handle {
          display: none;
        }
      }
      @keyframes fade {
        from {
          opacity: 0;
        }
      }
      @keyframes slide-up {
        from {
          transform: translateY(100%);
        }
      }
      @keyframes pop {
        from {
          opacity: 0;
          transform: translate(-50%, -46%) scale(0.97);
        }
      }
    `,
  ],
})
export class SheetComponent implements OnDestroy {
  readonly open = input(false);
  readonly title = input('');
  readonly closed = output<void>();

  constructor() {
    effect(() => {
      document.body.style.overflow = this.open() ? 'hidden' : '';
    });
  }

  onEscape() {
    if (this.open()) this.closed.emit();
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }
}
