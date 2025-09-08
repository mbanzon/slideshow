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

    this.setFaviconString('🖼️');
  }

  setFaviconString(emoji:string) {
    // Create a canvas to draw the emoji
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;

    const ctx = canvas.getContext("2d");

    if (ctx == null) return;

    ctx.font = "64px serif"; // Use serif for better emoji rendering
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, canvas.width / 2, canvas.height / 2);

    // Convert canvas to Data URL
    const faviconURL = canvas.toDataURL();

    // Find or create the favicon link element
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link") as HTMLLinkElement;
      link.rel = "icon";
      document.head.appendChild(link);
    }

    // Set the favicon to the emoji-generated image
    link.href = faviconURL;
  }
}