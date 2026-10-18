import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  imports: [MatIcon],
  selector: 'app-form-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './form-alert.scss',
  templateUrl: './form-alert.html',
})
export class FormAlert {
  readonly message = input.required<string>();
}
