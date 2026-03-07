import { effect, Injectable, signal } from '@angular/core';
import {
  ACTION_CLEAR,
  ACTION_LOAD,
  ACTION_NEXT,
  ACTION_PAUSE,
  ACTION_PREVIOUS,
  ACTION_RESUME,
  ACTION_START,
  ACTION_STOP,
  SlideshowAction,
  SlideshowState,
  SlideshowStateEffect,
  SlideshowStatemachine,
  STATE_HAS_IMAGES,
  STATE_NEW,
  STATE_PAUSED,
  STATE_RUNNING,
  STATE_STOPPED,
  STATE_STOPPED_PAUSED
} from '../SlideshowStatemachine';

@Injectable({
  providedIn: 'root'
})
export class SlideshowService {
  private imageFiles : File[] = [];
  private readonly preloadAheadCount : number = 2;
  private readonly preloadBehindCount : number = 1;

  randomized = signal<boolean>(false);
  interval = signal<number>(5);
  currentImgSrc = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  countdownProgress = signal<number>(0);

  private indicies : number[] = [];
  private indexIndex : number = 0;
  private ticker : ReturnType<typeof setTimeout> | null = null;
  private countdownTicker : ReturnType<typeof setInterval> | null = null;
  private nextTickAt : number | null = null;
  private countdownIntervalMs : number = 0;
  private readonly countdownLeadMs : number = 150;
  private currentLoadToken : number = 0;
  private preloadedImageSrcByIndex = new Map<number, string>();
  private loadingImageSrcByIndex = new Map<number, Promise<string>>();

  private stateMachine = new SlideshowStatemachine();

  private readonly effects = new Map<SlideshowState, SlideshowStateEffect>([
    [STATE_NEW, () => {
      this.resetAll();
    }],
    [STATE_HAS_IMAGES, () => {
      this.indicies = this.imageFiles.map((_, i) => i);
      if (this.randomized()) {
        this.indicies = this.indicies.sort(() => Math.random() - .5);
      } else {
        this.indicies = this.indicies.sort((a, b) => {
          const fileA = this.imageFiles[a];
          const fileB = this.imageFiles[b];
          const pathA = `${fileA.webkitRelativePath}/${fileA.name}`;
          const pathB = `${fileB.webkitRelativePath}/${fileB.name}`;
          return pathA.localeCompare(pathB);
        });
      }
      this.indexIndex = Math.min(this.indexIndex, Math.max(0, this.indicies.length - 1));
      this.resetPreloadCache();
      this.preloadNextImages();
    }],
    [STATE_RUNNING, () => {
      this.updateCurrentImage();
    }],
    [STATE_PAUSED, () => {
      this.stopTicker();
      this.updateCurrentImage();
    }],
    [STATE_STOPPED, () => {
      this.stopTicker();
    }],
    [STATE_STOPPED_PAUSED, () => {
      this.stopTicker();
    }],
  ]);

  constructor() {
    effect(() => {
      this.randomized();
      this.action(ACTION_LOAD);
    });
    effect(() => {
      this.interval();
      if (this.stateMachine.getState() === STATE_RUNNING) {
        this.startTicker();
      }
    });
  }

  private action(action: SlideshowAction) {
    this.stateMachine.performAction(action, this.effects);
  }

  appendImageFiles(imageFiles: File[]) {
    this.imageFiles = [...this.imageFiles, ...imageFiles];
    this.action(ACTION_LOAD);
  }

  private stopTicker() {
    if (this.ticker != null) {
      clearTimeout(this.ticker);
      this.ticker = null;
    }
    if (this.countdownTicker != null) {
      clearInterval(this.countdownTicker);
      this.countdownTicker = null;
    }
    this.nextTickAt = null;
    this.countdownIntervalMs = 0;
    this.countdownProgress.set(0);
  }

  private startTicker() {
    this.stopTicker();

    const intervalMs = this.interval() * 1000;
    this.countdownIntervalMs = intervalMs;
    this.nextTickAt = Date.now() + intervalMs;
    this.countdownProgress.set(0);
    this.startCountdownTicker();

    this.ticker = setTimeout(() => {
      if (this.stateMachine.getState() !== STATE_RUNNING) {
        return;
      }
      this.next();
    }, intervalMs);
  }

  private startCountdownTicker() {
    if (this.countdownTicker != null) {
      clearInterval(this.countdownTicker);
    }
    this.countdownTicker = setInterval(() => {
      if (this.nextTickAt == null || this.countdownIntervalMs <= 0) {
        this.countdownProgress.set(0);
        return;
      }
      const remainingMs = this.nextTickAt - Date.now();
      const adjustedRemainingMs = Math.max(0, remainingMs - this.countdownLeadMs);
      const progress = Math.min(1, Math.max(0, 1 - (adjustedRemainingMs / this.countdownIntervalMs)));
      this.countdownProgress.set(progress);
    }, 50);
  }

  next() {
    this.indexIndex = (this.indexIndex + 1) % this.indicies.length;
    this.action(ACTION_NEXT);
  }

  previous() {
    this.indexIndex = (this.indexIndex - 1 < 0 ? this.indicies.length - 1 : this.indexIndex - 1);
    this.action(ACTION_PREVIOUS);
  }

  restart() {
    this.indexIndex = 0;
    this.currentImgSrc.set(null);
    this.start();
  }

  clear = () => this.action(ACTION_CLEAR);
  start = () => this.action(ACTION_START);
  resume = () => this.action(ACTION_RESUME);
  pause = () => this.action(ACTION_PAUSE);
  stop = () => this.action(ACTION_STOP);

  isStarted = () => [STATE_RUNNING, STATE_PAUSED].indexOf(this.stateMachine.getState()) != -1;
  isPaused = () => [STATE_PAUSED, STATE_STOPPED_PAUSED].indexOf(this.stateMachine.getState()) != -1;
  isStopped = () => [STATE_STOPPED, STATE_STOPPED_PAUSED].indexOf(this.stateMachine.getState()) != -1;
  isRunning = () => this.stateMachine.getState() === STATE_RUNNING;
  hasImages = () => this.imageFiles.length > 0;
  imageCount = () => this.imageFiles.length;
  currentFile = (): File | null => {
    const currentImageIndex = this.getImageIndexAtPosition(this.indexIndex);
    if (currentImageIndex == null) {
      return null;
    }
    return this.imageFiles[currentImageIndex] ?? null;
  };
  currentFileName = () => this.currentFile()?.name ?? null;
  currentFileDisplayName = () => {
    const file = this.currentFile();
    if (file == null) {
      return null;
    }
    return file.webkitRelativePath || file.name;
  };

  private updateCurrentImage() {
    this.stopTicker();
    const currentImageIndex = this.getImageIndexAtPosition(this.indexIndex);
    if (currentImageIndex == null) {
      this.currentImgSrc.set(null);
      this.isLoading.set(false);
      return;
    }
    const loadToken = ++this.currentLoadToken;
    const cachedImageSrc = this.preloadedImageSrcByIndex.get(currentImageIndex);
    if (cachedImageSrc != null) {
      this.currentImgSrc.set(cachedImageSrc);
      this.isLoading.set(false);
      this.preloadNextImages();
      this.prunePreloadCache();
      if (this.stateMachine.getState() === STATE_RUNNING) {
        this.startTicker();
      }
      return;
    }
    this.isLoading.set(true);
    this.loadImageSrc(currentImageIndex).then((src) => {
      if (loadToken !== this.currentLoadToken) {
        return;
      }
      this.currentImgSrc.set(src);
      this.isLoading.set(false);
      this.preloadNextImages();
      this.prunePreloadCache();
      if (this.stateMachine.getState() === STATE_RUNNING) {
        this.startTicker();
      }
    }).catch(() => {
      if (loadToken !== this.currentLoadToken) {
        return;
      }
      this.isLoading.set(false);
      if (this.stateMachine.getState() === STATE_RUNNING) {
        this.startTicker();
      }
    });
  }

  private getImageIndexAtPosition(position: number): number | null {
    if (this.indicies.length === 0) {
      return null;
    }
    const normalizedPosition = ((position % this.indicies.length) + this.indicies.length) % this.indicies.length;
    return this.indicies[normalizedPosition];
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(reader.error);
      };
      reader.readAsDataURL(file);
    });
  }

  private loadImageSrc(imageIndex: number): Promise<string> {
    const cachedSrc = this.preloadedImageSrcByIndex.get(imageIndex);
    if (cachedSrc != null) {
      return Promise.resolve(cachedSrc);
    }

    const pendingLoad = this.loadingImageSrcByIndex.get(imageIndex);
    if (pendingLoad != null) {
      return pendingLoad;
    }

    const file = this.imageFiles[imageIndex];
    if (file == null) {
      return Promise.reject(new Error(`Image index ${imageIndex} is not available`));
    }

    const loadPromise = this.readFileAsDataURL(file)
      .then((src) => {
        this.preloadedImageSrcByIndex.set(imageIndex, src);
        this.loadingImageSrcByIndex.delete(imageIndex);
        return src;
      })
      .catch((error) => {
        this.loadingImageSrcByIndex.delete(imageIndex);
        throw error;
      });

    this.loadingImageSrcByIndex.set(imageIndex, loadPromise);
    return loadPromise;
  }

  private preloadNextImages() {
    for (let offset = 1; offset <= this.preloadAheadCount; offset++) {
      const imageIndex = this.getImageIndexAtPosition(this.indexIndex + offset);
      if (imageIndex == null) {
        continue;
      }
      void this.loadImageSrc(imageIndex);
    }
  }

  private prunePreloadCache() {
    if (this.indicies.length === 0) {
      this.resetPreloadCache();
      return;
    }
    const imageIndicesToKeep = new Set<number>();
    for (let offset = -this.preloadBehindCount; offset <= this.preloadAheadCount; offset++) {
      const imageIndex = this.getImageIndexAtPosition(this.indexIndex + offset);
      if (imageIndex != null) {
        imageIndicesToKeep.add(imageIndex);
      }
    }
    for (const imageIndex of Array.from(this.preloadedImageSrcByIndex.keys())) {
      if (!imageIndicesToKeep.has(imageIndex)) {
        this.preloadedImageSrcByIndex.delete(imageIndex);
      }
    }
    for (const imageIndex of Array.from(this.loadingImageSrcByIndex.keys())) {
      if (!imageIndicesToKeep.has(imageIndex)) {
        this.loadingImageSrcByIndex.delete(imageIndex);
      }
    }
  }

  private resetPreloadCache() {
    this.preloadedImageSrcByIndex.clear();
    this.loadingImageSrcByIndex.clear();
  }

  private resetAll() {
    this.stopTicker();
    this.imageFiles = [];
    this.indicies = [];
    this.indexIndex = 0;
    this.currentLoadToken++;
    this.resetPreloadCache();
    this.currentImgSrc.set(null);
    this.isLoading.set(false);
    this.countdownProgress.set(0);
  }
}
