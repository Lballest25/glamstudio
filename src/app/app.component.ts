import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { InstallService } from './core/services/install.service';
import { ToastHostComponent } from './shared/components/toast-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastHostComponent],
  template: `<router-outlet /><app-toast-host />`,
})
export class AppComponent {
  // Created at startup so the browser's install prompt event isn't missed.
  private readonly install = inject(InstallService);

  constructor() {
    // Clients install "Reservas", the studio installs the admin panel.
    inject(Router)
      .events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const link = document.getElementById('app-manifest') as HTMLLinkElement | null;
        const href = e.urlAfterRedirects.startsWith('/admin') ? '/manifest.webmanifest' : '/manifest-booking.webmanifest';
        if (link && !link.href.endsWith(href)) link.href = href;
      });
  }
}
