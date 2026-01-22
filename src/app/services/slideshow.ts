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

  randomized = signal<boolean>(false);
  interval = signal<number>(5);
  currentImgSrc = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  countdown = signal<number>(0);

  private indicies : number[] = [];
  private indexIndex : number = 0;
  private ticker : ReturnType<typeof setTimeout> | null = null;
  private countdownTicker : ReturnType<typeof setInterval> | null = null;
  private nextTickAt : number | null = null;

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
    }],
    [STATE_RUNNING, () => {
      this.updateCurrentImage();
      this.startTicker();
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
    this.countdown.set(0);
  }

  private startTicker() {
    this.stopTicker();

    const intervalMs = this.interval() * 1000;
    this.nextTickAt = Date.now() + intervalMs;
    this.countdown.set(this.interval());
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
      if (this.nextTickAt == null) {
        return;
      }
      const remainingMs = this.nextTickAt - Date.now();
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
      this.countdown.set(remainingSeconds);
    }, 200);
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

  private updateCurrentImage() {
    const reader = new FileReader();
    this.isLoading.set(true);
    reader.onload = () => {
      this.currentImgSrc.set(reader.result as string);
      this.isLoading.set(false);
    };
    reader.onerror = () => {
      this.isLoading.set(false);
    };
    reader.readAsDataURL(this.imageFiles[this.indicies[this.indexIndex]]);
  }

  private resetAll() {
    this.imageFiles = [];
    this.indicies = [];
    this.indexIndex = 0;
    this.ticker = null;
    this.currentImgSrc.set(null);
    this.isLoading.set(false);
    this.countdown.set(0);
  }
}
