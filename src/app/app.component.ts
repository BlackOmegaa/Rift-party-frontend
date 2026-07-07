import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DraftService } from './core/services/draft.service';
import { MixRuntimeService } from './core/services/mix-runtime.service';
import { SupporterOfferModalComponent } from './shared/components/supporter-offer-modal/supporter-offer-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SupporterOfferModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly draftService = inject(DraftService);
  private readonly mixRuntime = inject(MixRuntimeService);
}
