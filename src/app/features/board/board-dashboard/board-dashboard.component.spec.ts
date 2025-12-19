import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoardDashboardComponent } from './board-dashboard.component';

describe('BoardDashboardComponent', () => {
  let component: BoardDashboardComponent;
  let fixture: ComponentFixture<BoardDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BoardDashboardComponent]
    });
    fixture = TestBed.createComponent(BoardDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
