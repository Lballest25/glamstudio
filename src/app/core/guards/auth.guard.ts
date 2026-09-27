import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Mirrors the redirect logic in lib/core/routing/app_router.dart: no
// session on a protected route -> send to /admin/login; an authenticated
// user visiting /admin/login -> send to /admin.
async function waitForAuthInit(auth: AuthService): Promise<void> {
  if (auth.initialized()) return;
  await new Promise<void>((resolve) => {
    const check = () => (auth.initialized() ? resolve() : setTimeout(check, 20));
    check();
  });
}

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await waitForAuthInit(auth);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/admin/login']);
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await waitForAuthInit(auth);
  return auth.isAuthenticated() ? router.createUrlTree(['/admin']) : true;
};
