import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SlideshowPlayer } from './slideshow-player';

describe('SlideshowPlayer', () => {
  let component: SlideshowPlayer;
  let fixture: ComponentFixture<SlideshowPlayer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlideshowPlayer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SlideshowPlayer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
