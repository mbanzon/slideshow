import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SlideshowService {
  imagesFiles = signal<File[]>([]);
  randomized = signal<boolean>(false);
  interval = signal<number>(5);
  isStarted = signal<boolean>(false);
  currentImgSrc = signal<string | null>(null);
  isPaused = signal<boolean>(false);

  private indicies : number[] = [];
  private indexIndex : number = 0;
  private ticker : any = null;

  appendImageFiles(imageFiles: File[]) {
    this.imagesFiles.set([...this.imagesFiles(), ...imageFiles])
  }

  startSlideshow() {
    this.indicies = this.imagesFiles().map((_, i) => i);
    if (this.randomized()) {
      this.indicies = this.indicies.sort(() => Math.random() - .5);
    }

    this.updateCurrentImage();

    this.startTicker();

    this.isStarted.set(true);
  }

  private startTicker() {
    if (this.ticker != null) {
      clearInterval(this.ticker);
      this.ticker = null;
    }

    this.ticker = setInterval(() => {
      if (this.isPaused() || !this.isStarted()) {
        return;
      }
      this.next();
    }, this.interval() * 1000);
  }

  public next() {
    this.indexIndex = (this.indexIndex + 1) % this.imagesFiles().length;
    this.updateCurrentImage();
    this.startTicker();
  }

  public previous() {
    this.indexIndex = (this.indexIndex - 1 < 0 ? this.indicies.length - 1 : this.indexIndex - 1);
    this.updateCurrentImage();
    this.startTicker();
  }

  private updateCurrentImage() {
    const reader = new FileReader();
    reader.onload = () => this.currentImgSrc.set(reader.result as string);
    reader.readAsDataURL(this.imagesFiles()[this.indicies[this.indexIndex]]);
  }

  restartSlideshow() {
    this.indexIndex = 0;
    this.startTicker();
    this.isStarted.set(true);
  }

  stopSlideshow() {
    this.isStarted.set(false);
  }

  canResume() {
    return this.indexIndex != 0;
  }
}
