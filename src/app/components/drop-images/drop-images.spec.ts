import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropImages } from './drop-images';

describe('DropImages', () => {
  let component: DropImages;
  let fixture: ComponentFixture<DropImages>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropImages]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DropImages);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
