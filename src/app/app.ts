import { Component, inject, OnInit } from '@angular/core';
import { DropImages } from "./components/drop-images/drop-images";
import { SlideshowService } from './services/slideshow';
import { ImageCount } from "./components/image-count/image-count";
import { SlideshowConfig } from "./components/slideshow-config/slideshow-config";
import { SlideshowPlayer } from './components/slideshow-player/slideshow-player';

@Component({
  selector: 'app-root',
  imports: [ DropImages, ImageCount, SlideshowConfig, SlideshowPlayer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  slideshowService = inject(SlideshowService);

  ngOnInit(): void {
    window.addEventListener('beforeunload', e => {
      if (this.slideshowService.imagesFiles().length > 0) {
        e.preventDefault();
      }
    });
  }
}
