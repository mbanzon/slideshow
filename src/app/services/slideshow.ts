import { effect, Injectable, signal } from '@angular/core';
import { ACTION_CLEAR, ACTION_LOAD, ACTION_NEXT, ACTION_PAUSE, ACTION_PREVIOUS, ACTION_RESUME, ACTION_START, ACTION_STOP, SlideshowAction, SlideshowState, SlideshowStateEffect, SlideshowStatemachine, STATE_HAS_IMAGES, STATE_NEW, STATE_PAUSED, STATE_RUNNING, STATE_STOPPED } from '../SlideshowStatemachine';



@Injectable({
  providedIn: 'root'
})
export class SlideshowService {
  private imageFiles : File[] = [];

  randomized = signal<boolean>(false);
  interval = signal<number>(5);
  currentImgSrc = signal<string | null>(null);

  private indicies : number[] = [];
  private indexIndex : number = 0;
  private ticker : any = null;

  private stateMachine = new SlideshowStatemachine();

  private readonly effects = new Map<SlideshowState, SlideshowStateEffect>([
    [STATE_NEW, () => {
      this.resetAll();
    }],
    [STATE_HAS_IMAGES, () => {
      this.indicies = this.imageFiles.map((_, i) => i);
      if (this.randomized()) {
        this.indicies = this.indicies.sort(() => Math.random() - .5);
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
  ]);

  constructor() {
    effect(() => {
      this.randomized();
      this.action(ACTION_LOAD);
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
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  private startTicker() {
    this.stopTicker();
    
    this.ticker = setInterval(() => {
      this.next();
    }, this.interval() * 1000);
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
  isPaused = () => STATE_PAUSED == this.stateMachine.getState();
  isStopped = () => STATE_STOPPED == this.stateMachine.getState();
  hasImages = () => this.imageFiles.length > 0;
  imageCount = () => this.imageFiles.length;

  private updateCurrentImage() {
    const reader = new FileReader();
    reader.onload = () => this.currentImgSrc.set(reader.result as string);
    reader.readAsDataURL(this.imageFiles[this.indicies[this.indexIndex]]);
  }

  private resetAll() {
    this.imageFiles = [];
    this.indicies = [];
    this.indexIndex = 0;
    this.ticker = null;
    this.currentImgSrc.set(null);
  }
}
