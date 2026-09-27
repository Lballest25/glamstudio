import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <img src="logo.png" alt="GlamStudio" class="logo" />
        <h1>GlamStudio</h1>
        <p class="subtitle">Panel de administración</p>

        <form (ngSubmit)="submit()">
          <label>
            Email
            <input type="email" name="email" [(ngModel)]="email" required autocomplete="username" />
          </label>
          <label>
            Contraseña
            <input type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" />
          </label>

          @if (errorMessage()) {
            <p class="error">{{ errorMessage() }}</p>
          }

          <button type="submit" [disabled]="loading()">
            {{ loading() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>

        <p class="footer-note">¿No tienes cuenta? Pide a tu administrador que la cree desde el panel de Supabase.</p>
      </div>
    </div>
  `,
  styles: [
    `
      .login-page {
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-background);
        padding: 16px;
      }
      .login-card {
        width: 100%;
        max-width: 380px;
        background: var(--color-surface);
        border-radius: var(--radius-md);
        padding: 32px 28px;
        box-shadow: 0 4px 24px rgba(29, 16, 48, 0.08);
        text-align: center;
      }
      .logo {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        object-fit: cover;
        margin-bottom: 12px;
      }
      h1 {
        margin: 0;
        color: var(--color-text-primary);
      }
      .subtitle {
        color: var(--color-text-secondary);
        margin-top: 4px;
        margin-bottom: 24px;
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        text-align: left;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 14px;
        color: var(--color-text-secondary);
      }
      input {
        border: 1px solid var(--color-divider);
        border-radius: var(--radius-md);
        padding: 10px 12px;
        font-size: 15px;
        font-family: inherit;
      }
      input:focus {
        outline: 2px solid var(--color-primary-light);
        border-color: var(--color-primary);
      }
      button {
        background: var(--color-primary);
        color: white;
        border: none;
        border-radius: var(--radius-md);
        padding: 12px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .error {
        color: var(--color-error);
        font-size: 14px;
        margin: 0;
      }
      .footer-note {
        margin-top: 20px;
        font-size: 12px;
        color: var(--color-text-hint);
      }
    `,
  ],
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  async submit() {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      await this.auth.signIn(this.email, this.password);
      await this.router.navigateByUrl('/admin');
    } catch (error) {
      this.errorMessage.set(this.auth.translateError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
