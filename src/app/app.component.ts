import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
}
