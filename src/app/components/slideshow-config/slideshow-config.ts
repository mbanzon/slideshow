import { Component, inject } from '@angular/core';
import { SlideshowService } from '../../services/slideshow';

@Component({
  selector: 'app-slideshow-config',
  imports: [],
  templateUrl: './slideshow-config.html',
  styleUrl: './slideshow-config.css'
})
export class SlideshowConfig {
  slideshowService = inject(SlideshowService);

  Number(n: string): number {
    return Number(n);
  }
}
