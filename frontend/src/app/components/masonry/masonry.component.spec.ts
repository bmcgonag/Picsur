import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { MasonryComponent } from './masonry.component';
import { MasonryItemDirective } from './masonry-item.directive';

describe('MasonryComponent', () => {
  let component: MasonryComponent;
  let fixture: ComponentFixture<MasonryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MasonryComponent, MasonryItemDirective],
      providers: [ChangeDetectorRef],
    }).compileComponents();

    fixture = TestBed.createComponent(MasonryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('column_count input', () => {
    it('should set column count', () => {
      component.column_count = 3;
      expect(component._column_count).toBe(3);
    });

    it('should default to 1 column', () => {
      expect(component._column_count).toBe(1);
    });
  });

  describe('update_speed input', () => {
    it('should default to 200ms', () => {
      expect(component.update_speed).toBe(200);
    });

    it('should accept custom update speed', () => {
      component.update_speed = 500;
      expect(component.update_speed).toBe(500);
    });
  });
});
