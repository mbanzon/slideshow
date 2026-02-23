import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { SlideshowPlayer } from './slideshow-player';
import { SlideshowService } from '../../services/slideshow';

describe('SlideshowPlayer', () => {
  let component: SlideshowPlayer;
  let fixture: ComponentFixture<SlideshowPlayer>;
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
    slideshowServiceMock = createSlideshowServiceMock();
    await TestBed.configureTestingModule({
      imports: [SlideshowPlayer],
      providers: [
        { provide: SlideshowService, useValue: slideshowServiceMock }
      ]
    })
    .compileComponents();

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
});
