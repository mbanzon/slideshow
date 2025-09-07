import { Component, inject } from '@angular/core';
import { SlideshowService } from '../../services/slideshow';

@Component({
  selector: 'app-image-count',
  imports: [],
  templateUrl: './image-count.html',
  styleUrl: './image-count.css'
})
export class ImageCount {
  slideshowService = inject(SlideshowService);

  clearImages() {
    if (confirm("Are you sure you want to clear all images?")) {
      this.slideshowService.imagesFiles.set([]);
    }
  }
}
