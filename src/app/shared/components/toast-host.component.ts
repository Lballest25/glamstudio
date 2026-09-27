import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="true">
      @for (t of toast.toasts(); track t.id) {
        <button
          type="button"
          class="toast"
          [class.toast-error]="t.kind === 'error'"
          [class.toast-info]="t.kind === 'info'"
          (click)="toast.dismiss(t.id)"
        >
          <app-icon [name]="t.kind === 'error' ? 'alert-circle' : t.kind === 'info' ? 'info' : 'check-circle'" [size]="18" />
          <span>{{ t.message }}</span>
        </button>
      }
    </div>
  `,
  styles: [
    `
      .toasts {
        position: fixed;
        top: calc(12px + env(safe-area-inset-top));
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        width: min(420px, calc(100vw - 24px));
        pointer-events: none;
      }
      .toast {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 12px 16px;
        border: 0;
        border-radius: var(--r-md);
        background: var(--c-plum);
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        text-align: left;
        box-shadow: var(--sh-lg);
        cursor: pointer;
        animation: toast-in 0.25s cubic-bezier(0.2, 1, 0.4, 1) both;
      }
      .toast app-icon {
        color: #7fe0ae;
      }
      .toast-error {
        background: var(--c-danger);
      }
      .toast-error app-icon,
      .toast-info app-icon {
        color: #fff;
      }
      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateY(-10px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
    `,
  ],
})
export class ToastHostComponent {
  readonly toast = inject(ToastService);
}
