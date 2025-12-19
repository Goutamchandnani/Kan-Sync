import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';


import { BoardService } from './services/board.service';
import { WebSocketService } from './services/websocket.service';
import { ActivityFeedComponent } from './components/activity-feed/activity-feed.component';
import { ActiveUsersComponent } from './components/active-users/active-users.component';
import { BoardDashboardComponent } from './board-dashboard/board-dashboard.component';
import { BoardListComponent } from './components/board-list/board-list.component';
import { AddUserModalComponent } from './components/add-user-modal/add-user-modal.component';
import { RemoveUserModalComponent } from './components/remove-user-modal/remove-user-modal.component';

const routes: Routes = [
  {
    path: '',
    component: BoardDashboardComponent,
    children: [
      {
        path: ':id',
        loadComponent: () => {
                  console.log('Attempting to load BoardComponent');
                  return import('./components/board/board.component').then(m => m.BoardComponent);
                }
      }
    ]
  }
];

@NgModule({
  declarations: [
    BoardDashboardComponent
  ],
  imports: [
    CommonModule,
    DragDropModule,
    ReactiveFormsModule,
    MatDialogModule,
    RouterModule.forChild(routes),
    ActiveUsersComponent,
    BoardListComponent
  ],
  providers: [
    BoardService,
    WebSocketService
  ]
})
export class BoardModule { }