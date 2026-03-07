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
  let isMobileViewport = false;
  let requestFullscreenSpy: jasmine.Spy<() => Promise<void>>;
  let exitFullscreenSpy: jasmine.Spy<() => Promise<void>>;
  let slideshowServiceMock: {
    currentImgSrc: WritableSignal<string | null>;
    isLoading: WritableSignal<boolean>;
    countdownProgress: WritableSignal<number>;
    currentFileName: jasmine.Spy;
    currentFileDisplayName: jasmine.Spy;
    isRunning: jasmine.Spy;
    isStopped: jasmine.Spy;
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
    currentFileName: jasmine.createSpy('currentFileName').and.returnValue('photo.jpg'),
    currentFileDisplayName: jasmine.createSpy('currentFileDisplayName').and.returnValue('album/photo.jpg'),
    isRunning: jasmine.createSpy('isRunning').and.returnValue(false),
    isStopped: jasmine.createSpy('isStopped').and.returnValue(false),
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
    isMobileViewport = false;
    slideshowServiceMock = createSlideshowServiceMock();

    if (typeof window.matchMedia !== 'function') {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: () => ({
          matches: false,
          media: '',
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false
        })
      });
    }

    spyOn(window, 'matchMedia').and.callFake((query: string) => ({
      matches: isMobileViewport,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    } as MediaQueryList));

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

  it('should exit fullscreen on destroy when fullscreen is active', () => {
    fullscreenElement = fullScreenDocument.documentElement;

    component.ngOnDestroy();

    expect(exitFullscreenSpy).toHaveBeenCalledTimes(1);
  });

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

  it('should show the info button while the slideshow is active', () => {
    expect(fixture.nativeElement.querySelector('.info-button')).toBeNull();

    slideshowServiceMock.isRunning.and.returnValue(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.info-button')).not.toBeNull();
  });

  it('should show the info button while the slideshow is paused', () => {
    slideshowServiceMock.isPaused.and.returnValue(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.info-button')).not.toBeNull();
  });

  it('should pause the slideshow and open the image details dialog from the info button', () => {
    slideshowServiceMock.isRunning.and.returnValue(true);
    fixture.detectChanges();

    const infoButton = fixture.nativeElement.querySelector('.info-button') as HTMLButtonElement;
    infoButton.click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.info-dialog') as HTMLElement;
    const filename = fixture.nativeElement.querySelector('.info-dialog-filename') as HTMLElement;
    const downloadLink = fixture.nativeElement.querySelector('.info-dialog-download') as HTMLAnchorElement;

    expect(slideshowServiceMock.pause).toHaveBeenCalledTimes(1);
    expect(dialog).not.toBeNull();
    expect(filename.textContent?.trim()).toBe('album/photo.jpg');
    expect(downloadLink.getAttribute('download')).toBe('photo.jpg');
    expect(downloadLink.getAttribute('href')).toBe('data:image/png;base64,abc');
  });

  it('should hide the fullscreen toggle on mobile', () => {
    isMobileViewport = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.fullscreen-toggle-button')).toBeNull();
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

  it('should keep slideshow state unchanged when exiting fullscreen while active', () => {
    slideshowServiceMock.isRunning.and.returnValue(true);

    fullscreenElement = fullScreenDocument.documentElement;
    fullScreenDocument.dispatchEvent(new Event('fullscreenchange'));
    expect(slideshowServiceMock.stop).not.toHaveBeenCalled();

    fullscreenElement = null;
    fullScreenDocument.dispatchEvent(new Event('fullscreenchange'));
    expect(slideshowServiceMock.stop).not.toHaveBeenCalled();
  });

  it('should report fullscreen as unavailable when browser support is disabled', () => {
    fullscreenEnabled = false;

    expect(component.isFullscreenAvailable()).toBeFalse();
  });

  it('should report fullscreen as unavailable on mobile', () => {
    isMobileViewport = true;

    expect(component.isFullscreenAvailable()).toBeFalse();
  });

  it('should not toggle fullscreen on mobile', async () => {
    isMobileViewport = true;

    await component.toggleFullscreen();

    expect(requestFullscreenSpy).not.toHaveBeenCalled();
    expect(exitFullscreenSpy).not.toHaveBeenCalled();
  });

  it('should keep controls visible on mobile even when cursor is hidden', fakeAsync(() => {
    isMobileViewport = true;
    slideshowServiceMock.isRunning.and.returnValue(true);
    component.onImageMouseMove();
    tick(2000);

    component.isFullscreen = true;
    expect(component.shouldHideControls()).toBeFalse();
  }));

  it('should exit fullscreen when slideshow is stopped', async () => {
    fullscreenElement = fullScreenDocument.documentElement;
    slideshowServiceMock.isStopped.and.returnValue(true);

    component.ngDoCheck();
    await Promise.resolve();

    expect(exitFullscreenSpy).toHaveBeenCalled();
  });

  it('should keep fullscreen when slideshow is not stopped', async () => {
    fullscreenElement = fullScreenDocument.documentElement;
    slideshowServiceMock.isStopped.and.returnValue(false);

    component.ngDoCheck();
    await Promise.resolve();

    expect(exitFullscreenSpy).not.toHaveBeenCalled();
  });
});
