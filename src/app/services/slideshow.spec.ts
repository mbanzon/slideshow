import { TestBed } from '@angular/core/testing';

import { SlideshowService } from './slideshow';

describe('Slideshow', () => {
  let service: SlideshowService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SlideshowService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
