import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, DoCheck, inject, OnDestroy, PLATFORM_ID } from '@angular/core';
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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly mobileMediaQuery = '(max-width: 768px), (pointer: coarse)';
  private readonly hideCursorDelayMs = 2000;
  private hideCursorTimeout: ReturnType<typeof setTimeout> | null = null;
  private isExitingFullscreen = false;
  private cursorHidden = false;
  private wasRunning = this.slideshowService.isRunning();
  isFullscreen = false;
  isInfoDialogOpen = false;

  private readonly fullscreenChangeHandler = () => {
    this.isFullscreen = this.document.fullscreenElement != null;
    if (this.isMobileDevice()) {
      return;
    }
    this.exitFullscreenIfStopped();
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
    if (this.isMobileDevice()) {
      return false;
    }
    return this.isFullscreen && this.shouldHideCursor() && !this.isInfoDialogOpen;
  }

  openInfoDialog() {
    if (this.slideshowService.isRunning()) {
      this.slideshowService.pause();
    }
    this.isInfoDialogOpen = true;
    this.showCursor();
    this.clearHideCursorTimeout();
  }

  closeInfoDialog() {
    this.isInfoDialogOpen = false;
  }

  async toggleFullscreen() {
    if (!this.isFullscreenAvailable() || this.isMobileDevice()) {
      return;
    }

    if (this.document.fullscreenElement != null) {
      await this.document.exitFullscreen();
      return;
    }

    await this.document.documentElement.requestFullscreen();
  }

  isFullscreenAvailable() {
    if (this.isMobileDevice()) {
      return false;
    }

    return this.document.fullscreenEnabled
      && typeof this.document.documentElement.requestFullscreen === 'function'
      && typeof this.document.exitFullscreen === 'function';
  }

  isMobileDevice() {
    if (!this.isBrowser || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(this.mobileMediaQuery).matches;
  }

  ngDoCheck() {
    const isRunning = this.slideshowService.isRunning();
    if (this.wasRunning && !isRunning) {
      this.showCursor();
      this.clearHideCursorTimeout();
    }
    if (this.slideshowService.currentImgSrc() == null) {
      this.isInfoDialogOpen = false;
    }
    this.exitFullscreenIfStopped();
    this.wasRunning = isRunning;
  }

  ngOnDestroy() {
    this.clearHideCursorTimeout();
    this.document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
    this.exitFullscreenIfActive();
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

  private exitFullscreenIfStopped() {
    if (this.isMobileDevice()) {
      return;
    }
    if (this.isExitingFullscreen) {
      return;
    }
    if (!this.slideshowService.isStopped()) {
      return;
    }
    if (this.document.fullscreenElement == null || typeof this.document.exitFullscreen !== 'function') {
      return;
    }

    this.isExitingFullscreen = true;
    void this.document.exitFullscreen().finally(() => {
      this.isExitingFullscreen = false;
    });
  }

  private exitFullscreenIfActive() {
    if (this.isMobileDevice()) {
      return;
    }
    if (this.document.fullscreenElement == null || typeof this.document.exitFullscreen !== 'function') {
      return;
    }
    void this.document.exitFullscreen();
  }
}
