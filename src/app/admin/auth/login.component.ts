import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="auth">
      <section class="art" aria-hidden="true">
        <div class="art-inner">
          <img src="logo.png" alt="" class="art-logo" />
          <h2 class="art-title">Tu estudio, organizado con estilo.</h2>
          <p class="art-text">Citas, clientas, fidelización y reportes en un solo lugar.</p>
          <ul class="art-points">
            <li><app-icon name="calendar-check" [size]="18" /> Agenda sin cruces de horario</li>
            <li><app-icon name="crown" [size]="18" /> Fidelización automática</li>
            <li><app-icon name="link" [size]="18" /> Reservas en línea para tus clientas</li>
          </ul>
        </div>
      </section>

      <section class="form-side">
        <div class="form-wrap fade-in">
          <img src="logo.png" alt="GlamStudio" class="mobile-logo" />
          <h1>Hola de nuevo</h1>
          <p class="muted lead">Ingresa a tu panel de GlamStudio.</p>

          <form class="stack" (ngSubmit)="submit()">
            <label class="field">
              <span class="field-label">Correo</span>
              <span class="input-icon">
                <app-icon name="mail" [size]="18" />
                <input
                  class="input"
                  type="email"
                  name="email"
                  [(ngModel)]="email"
                  autocomplete="username"
                  inputmode="email"
                  placeholder="tu@correo.com"
                  required
                />
              </span>
            </label>

            <label class="field">
              <span class="field-label">Contraseña</span>
              <span class="input-icon password">
                <app-icon name="lock" [size]="18" />
                <input
                  class="input"
                  [type]="showPassword() ? 'text' : 'password'"
                  name="password"
                  [(ngModel)]="password"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  class="reveal"
                  (click)="showPassword.set(!showPassword())"
                  [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                >
                  <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="18" />
                </button>
              </span>
            </label>

            @if (errorMessage()) {
              <div class="alert alert-danger">
                <app-icon name="alert-circle" [size]="18" />
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="loading() || !email || !password">
              @if (loading()) {
                <span class="spinner"></span>
                Entrando…
              } @else {
                Entrar
              }
            </button>
          </form>

          <p class="foot">¿Buscas agendar una cita? <a routerLink="/agendar">Reserva aquí</a></p>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .auth {
        min-height: 100dvh;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
      .art {
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px;
        color: #fff;
        background:
          radial-gradient(90% 70% at 0% 0%, rgba(255, 255, 255, 0.16), transparent 60%),
          radial-gradient(70% 70% at 100% 100%, rgba(233, 196, 106, 0.3), transparent 60%),
          linear-gradient(145deg, #3d2656 0%, #6a4793 55%, #9c7bb8 100%);
      }
      .art-inner {
        max-width: 420px;
      }
      .art-logo {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        object-fit: cover;
        background: #fff;
        box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.2);
        margin-bottom: 32px;
      }
      .art-title {
        font-family: var(--f-display);
        font-weight: 600;
        font-size: 40px;
        line-height: 1.1;
        color: #fff;
      }
      .art-text {
        margin-top: 14px;
        font-size: 16px;
        opacity: 0.85;
      }
      .art-points {
        list-style: none;
        padding: 0;
        margin: 32px 0 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
        font-weight: 600;
      }
      .art-points li {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .art-points app-icon {
        width: 34px !important;
        height: 34px !important;
        padding: 8px;
        border-radius: var(--r-sm);
        background: rgba(255, 255, 255, 0.14);
      }
      .form-side {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 24px;
      }
      .form-wrap {
        width: 100%;
        max-width: 380px;
      }
      .mobile-logo {
        display: none;
        width: 68px;
        height: 68px;
        border-radius: 50%;
        object-fit: cover;
        margin-bottom: 20px;
        box-shadow: 0 0 0 1px var(--c-border), var(--sh-md);
      }
      .lead {
        margin: 8px 0 28px;
      }
      .password .input {
        padding-right: 48px;
      }
      .reveal {
        position: absolute;
        right: 6px;
        top: 50%;
        transform: translateY(-50%);
        width: 38px;
        height: 38px;
        border: 0;
        border-radius: var(--r-sm);
        background: transparent;
        color: var(--c-text-3);
        display: grid;
        place-items: center;
        cursor: pointer;
      }
      .reveal:hover {
        background: var(--c-surface-2);
        color: var(--c-text);
      }
      .foot {
        margin-top: 28px;
        text-align: center;
        font-size: 14px;
        color: var(--c-text-2);
      }
      .foot a {
        font-weight: 700;
      }
      @media (max-width: 899px) {
        .auth {
          grid-template-columns: 1fr;
        }
        .art {
          display: none;
        }
        .form-side {
          align-items: flex-start;
          padding-top: calc(56px + env(safe-area-inset-top));
        }
        .mobile-logo {
          display: block;
        }
      }
    `,
  ],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);

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
