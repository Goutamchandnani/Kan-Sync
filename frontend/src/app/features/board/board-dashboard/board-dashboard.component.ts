import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-board-dashboard',
  templateUrl: './board-dashboard.component.html',
  styleUrls: ['./board-dashboard.component.css']
})
export class BoardDashboardComponent implements OnInit, OnDestroy {

  constructor(private router: Router, private route: ActivatedRoute) { }

  ngOnInit(): void {
    console.log('BoardDashboardComponent ngOnInit called.');
  }

  ngOnDestroy(): void {
    console.log('BoardDashboardComponent ngOnDestroy called.');
  }
}
