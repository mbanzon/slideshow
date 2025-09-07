import { Component, inject } from '@angular/core';
import { SlideshowService } from '../../services/slideshow';

@Component({
  selector: 'app-slideshow-player',
  imports: [],
  templateUrl: './slideshow-player.html',
  styleUrl: './slideshow-player.css'
})
export class SlideshowPlayer {
  slideshowService = inject(SlideshowService);
}
