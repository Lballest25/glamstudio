import { Injectable, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

// Mirrors lib/features/auth/ + core/network/supabase_provider.dart from the
// Flutter app: a single source of truth for the current session, kept in
// sync via Supabase's own onAuthStateChange stream.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _session = signal<Session | null>(null);
  private readonly _initialized = signal(false);

  readonly session = this._session.asReadonly();
  readonly initialized = this._initialized.asReadonly();
  readonly currentUser = signal<User | null>(null);

  constructor(private readonly supabase: SupabaseService) {
    this.supabase.client.auth.getSession().then(({ data }) => {
      this._session.set(data.session);
      this.currentUser.set(data.session?.user ?? null);
      this._initialized.set(true);
    });

    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this._session.set(session);
      this.currentUser.set(session?.user ?? null);
      this._initialized.set(true);
    });
  }

  isAuthenticated(): boolean {
    return this._session() !== null;
  }

  async signIn(email: string, password: string) {
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut() {
    await this.supabase.client.auth.signOut();
  }

  // Spanish translations of the common Supabase auth errors, matching the
  // Flutter login screen's messages.
  translateError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
    if (message.includes('Email not confirmed')) return 'Confirma tu email antes de iniciar sesión.';
    if (message.includes('rate limit') || message.includes('Too many')) return 'Demasiados intentos. Espera un momento.';
    return 'No se pudo iniciar sesión. Intenta de nuevo.';
  }
}
