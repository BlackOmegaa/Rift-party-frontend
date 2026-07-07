import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DraftService } from './core/services/draft.service';
import { MixRuntimeService } from './core/services/mix-runtime.service';
import { SupporterOfferModalComponent } from './shared/components/supporter-offer-modal/supporter-offer-modal.component';
import { CheckoutConfirmationComponent } from './shared/components/checkout-confirmation/checkout-confirmation.component';
import { SupporterBadgeComponent } from './shared/components/supporter-badge/supporter-badge.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SupporterOfferModalComponent, CheckoutConfirmationComponent, SupporterBadgeComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly draftService = inject(DraftService);
  private readonly mixRuntime = inject(MixRuntimeService);
}
