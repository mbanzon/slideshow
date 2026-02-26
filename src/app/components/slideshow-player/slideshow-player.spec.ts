import { DOCUMENT } from '@angular/common';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { SlideshowPlayer } from './slideshow-player';
import { SlideshowService } from '../../services/slideshow';

describe('SlideshowPlayer', () => {
  let component: SlideshowPlayer;
  let fixture: ComponentFixture<SlideshowPlayer>;
  let fullScreenDocument: Document;
  let fullscreenEnabled = true;
  let fullscreenElement: Element | null = null;
  let requestFullscreenSpy: jasmine.Spy<() => Promise<void>>;
  let exitFullscreenSpy: jasmine.Spy<() => Promise<void>>;
  let slideshowServiceMock: {
    currentImgSrc: WritableSignal<string | null>;
    isLoading: WritableSignal<boolean>;
    countdownProgress: WritableSignal<number>;
    isRunning: jasmine.Spy;
    isPaused: jasmine.Spy;
    pause: jasmine.Spy;
    resume: jasmine.Spy;
    stop: jasmine.Spy;
    previous: jasmine.Spy;
    next: jasmine.Spy;
  };

  const createSlideshowServiceMock = () => ({
    currentImgSrc: signal<string | null>('data:image/png;base64,abc'),
    isLoading: signal(false),
    countdownProgress: signal(0),
    isRunning: jasmine.createSpy('isRunning').and.returnValue(false),
    isPaused: jasmine.createSpy('isPaused').and.returnValue(false),
    pause: jasmine.createSpy('pause'),
    resume: jasmine.createSpy('resume'),
    stop: jasmine.createSpy('stop'),
    previous: jasmine.createSpy('previous'),
    next: jasmine.createSpy('next')
  });

  beforeEach(async () => {
    fullscreenEnabled = true;
    fullscreenElement = null;
    slideshowServiceMock = createSlideshowServiceMock();
    await TestBed.configureTestingModule({
      imports: [SlideshowPlayer],
      providers: [
        { provide: SlideshowService, useValue: slideshowServiceMock }
      ]
    })
    .compileComponents();

    fullScreenDocument = TestBed.inject(DOCUMENT);
    Object.defineProperty(fullScreenDocument, 'fullscreenEnabled', {
      configurable: true,
      get: () => fullscreenEnabled
    });
    Object.defineProperty(fullScreenDocument, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement
    });

    requestFullscreenSpy = jasmine.createSpy('requestFullscreen')
      .and.callFake(async () => {
        fullscreenElement = fullScreenDocument.documentElement;
      });
    exitFullscreenSpy = jasmine.createSpy('exitFullscreen')
      .and.callFake(async () => {
        fullscreenElement = null;
      });

    Object.defineProperty(fullScreenDocument.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreenSpy
    });
    Object.defineProperty(fullScreenDocument, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreenSpy
    });

    fixture = TestBed.createComponent(SlideshowPlayer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should keep cursor visible when slideshow is not running', fakeAsync(() => {
    component.onImageMouseMove();
    tick(2100);
    expect(component.shouldHideCursor()).toBeFalse();
  }));

  it('should hide cursor after being idle while slideshow is running', fakeAsync(() => {
    slideshowServiceMock.isRunning.and.returnValue(true);
    component.onImageMouseMove();
    tick(1999);
    expect(component.shouldHideCursor()).toBeFalse();

    tick(1);
    expect(component.shouldHideCursor()).toBeTrue();
  }));

  it('should show cursor immediately on mouse move after hiding', fakeAsync(() => {
    slideshowServiceMock.isRunning.and.returnValue(true);
    component.onImageMouseMove();
    tick(2000);
    expect(component.shouldHideCursor()).toBeTrue();

    component.onImageMouseMove();
    expect(component.shouldHideCursor()).toBeFalse();
  }));

  it('should clear pending hide timer on destroy', fakeAsync(() => {
    slideshowServiceMock.isRunning.and.returnValue(true);
    component.onImageMouseMove();
    component.ngOnDestroy();
    tick(2100);

    expect(component.shouldHideCursor()).toBeFalse();
  }));

  it('should render compact symbolic controls with a shared button style', () => {
    const controlButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.playback-control-button')
    ) as HTMLButtonElement[];

    expect(controlButtons.length).toBe(4);
    expect(controlButtons.map((button) => button.textContent?.trim()))
      .toEqual(['⏸', '⏹', '⏮', '⏭']);
  });

  it('should render the play symbol when slideshow is paused', () => {
    slideshowServiceMock.isPaused.and.returnValue(true);
    fixture.detectChanges();

    const controlButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.playback-control-button')
    ) as HTMLButtonElement[];

    expect(controlButtons[0].textContent?.trim()).toBe('▶');
  });

  it('should render the fullscreen toggle as an icon button', () => {
    const fullscreenButton = fixture.nativeElement.querySelector('.fullscreen-toggle-button') as HTMLButtonElement;
    expect(fullscreenButton.textContent?.trim()).toBe('⤢');

    component.isFullscreen = true;
    fixture.detectChanges();

    expect(fullscreenButton.textContent?.trim()).toBe('⤡');
  });

  it('should enter fullscreen when not already fullscreen', async () => {
    await component.toggleFullscreen();

    expect(requestFullscreenSpy).toHaveBeenCalled();
    expect(exitFullscreenSpy).not.toHaveBeenCalled();
  });

  it('should exit fullscreen when already fullscreen', async () => {
    fullscreenElement = fullScreenDocument.documentElement;

    await component.toggleFullscreen();

    expect(exitFullscreenSpy).toHaveBeenCalled();
    expect(requestFullscreenSpy).not.toHaveBeenCalled();
  });

  it('should hide controls only when fullscreen and cursor are hidden', fakeAsync(() => {
    slideshowServiceMock.isRunning.and.returnValue(true);
    component.onImageMouseMove();
    tick(2000);

    expect(component.shouldHideControls()).toBeFalse();
    component.isFullscreen = true;
    expect(component.shouldHideControls()).toBeTrue();
  }));

  it('should update fullscreen state after fullscreenchange events', () => {
    fullscreenElement = fullScreenDocument.documentElement;
    fullScreenDocument.dispatchEvent(new Event('fullscreenchange'));
    expect(component.isFullscreen).toBeTrue();

    fullscreenElement = null;
    fullScreenDocument.dispatchEvent(new Event('fullscreenchange'));
    expect(component.isFullscreen).toBeFalse();
  });

  it('should report fullscreen as unavailable when browser support is disabled', () => {
    fullscreenEnabled = false;

    expect(component.isFullscreenAvailable()).toBeFalse();
  });

  it('should show a short fade when switching images', fakeAsync(() => {
    const nextImageSrc = 'data:image/png;base64,def';
    slideshowServiceMock.currentImgSrc.set(nextImageSrc);
    fixture.detectChanges();

    const baseImageDuringFade = fixture.nativeElement.querySelector('.base-image') as HTMLImageElement;
    const incomingImageDuringFade = fixture.nativeElement.querySelector('.incoming-image') as HTMLImageElement;
    expect(baseImageDuringFade.getAttribute('src')).toBe('data:image/png;base64,abc');
    expect(baseImageDuringFade.classList).toContain('base-image-fading');
    expect(incomingImageDuringFade.getAttribute('src')).toBe(nextImageSrc);
    expect(incomingImageDuringFade.classList).toContain('incoming-image-visible');

    tick(50);
    fixture.detectChanges();

    const baseImageAfterFade = fixture.nativeElement.querySelector('.base-image') as HTMLImageElement;
    expect(baseImageAfterFade.getAttribute('src')).toBe(nextImageSrc);
    expect(baseImageAfterFade.classList).not.toContain('base-image-fading');
    expect(fixture.nativeElement.querySelector('.incoming-image')).toBeNull();
  }));

  it('should cancel a pending fade if image source returns to the current image', fakeAsync(() => {
    slideshowServiceMock.currentImgSrc.set('data:image/png;base64,def');
    fixture.detectChanges();

    slideshowServiceMock.currentImgSrc.set('data:image/png;base64,abc');
    fixture.detectChanges();
    tick(50);
    fixture.detectChanges();

    const baseImage = fixture.nativeElement.querySelector('.base-image') as HTMLImageElement;
    expect(baseImage.getAttribute('src')).toBe('data:image/png;base64,abc');
    expect(baseImage.classList).not.toContain('base-image-fading');
    expect(fixture.nativeElement.querySelector('.incoming-image')).toBeNull();
  }));
});
