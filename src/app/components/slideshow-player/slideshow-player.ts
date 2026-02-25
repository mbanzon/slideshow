import { DOCUMENT } from '@angular/common';
import { Component, DoCheck, inject, OnDestroy } from '@angular/core';
import { SlideshowService } from '../../services/slideshow';

@Component({
  selector: 'app-slideshow-player',
  imports: [],
  templateUrl: './slideshow-player.html',
  styleUrl: './slideshow-player.css'
})
export class SlideshowPlayer implements DoCheck, OnDestroy {
  slideshowService = inject(SlideshowService);
  private readonly document = inject(DOCUMENT);
  private readonly hideCursorDelayMs = 2000;
  private hideCursorTimeout: ReturnType<typeof setTimeout> | null = null;
  private cursorHidden = false;
  private wasRunning = this.slideshowService.isRunning();
  isFullscreen = false;

  private readonly fullscreenChangeHandler = () => {
    this.isFullscreen = this.document.fullscreenElement != null;
  };

  constructor() {
    this.isFullscreen = this.document.fullscreenElement != null;
    this.document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
  }

  onImageMouseMove() {
    if (!this.slideshowService.isRunning()) {
      this.showCursor();
      this.clearHideCursorTimeout();
      return;
    }
    this.showCursor();
    this.startHideCursorTimeout();
  }

  onImageMouseEnter() {
    if (!this.slideshowService.isRunning()) {
      this.showCursor();
      return;
    }
    this.showCursor();
    this.startHideCursorTimeout();
  }

  onImageMouseLeave() {
    this.showCursor();
    this.clearHideCursorTimeout();
  }

  shouldHideCursor() {
    return this.slideshowService.isRunning() && this.cursorHidden;
  }

  shouldHideControls() {
    return this.isFullscreen && this.shouldHideCursor();
  }

  async toggleFullscreen() {
    if (!this.isFullscreenAvailable()) {
      return;
    }

    if (this.document.fullscreenElement != null) {
      await this.document.exitFullscreen();
      return;
    }

    await this.document.documentElement.requestFullscreen();
  }

  isFullscreenAvailable() {
    return this.document.fullscreenEnabled
      && typeof this.document.documentElement.requestFullscreen === 'function'
      && typeof this.document.exitFullscreen === 'function';
  }

  ngDoCheck() {
    const isRunning = this.slideshowService.isRunning();
    if (this.wasRunning && !isRunning) {
      this.showCursor();
      this.clearHideCursorTimeout();
    }
    this.wasRunning = isRunning;
  }

  ngOnDestroy() {
    this.clearHideCursorTimeout();
    this.document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
  }

  private startHideCursorTimeout() {
    this.clearHideCursorTimeout();
    this.hideCursorTimeout = setTimeout(() => {
      if (!this.slideshowService.isRunning()) {
        return;
      }
      this.cursorHidden = true;
    }, this.hideCursorDelayMs);
  }

  private clearHideCursorTimeout() {
    if (this.hideCursorTimeout == null) {
      return;
    }
    clearTimeout(this.hideCursorTimeout);
    this.hideCursorTimeout = null;
  }

  private showCursor() {
    this.cursorHidden = false;
  }
}
