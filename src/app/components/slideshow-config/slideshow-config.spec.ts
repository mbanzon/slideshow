import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SlideshowConfig } from './slideshow-config';

describe('SlideshowConfig', () => {
  let component: SlideshowConfig;
  let fixture: ComponentFixture<SlideshowConfig>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlideshowConfig]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SlideshowConfig);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
