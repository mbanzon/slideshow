import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageCount } from './image-count';

describe('ImageCount', () => {
  let component: ImageCount;
  let fixture: ComponentFixture<ImageCount>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageCount]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageCount);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
