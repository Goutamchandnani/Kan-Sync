import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Activity } from '../../../../core/models/activity.model';
import { ActiveUser } from '../../models/board.model';
import { WebSocketService } from '../../services/websocket.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Subscription } from 'rxjs';

import { ActivityService } from '../../services/activity.service';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DatePipe],
  template: `
    <div class="bg-white shadow rounded-lg p-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Activity Feed</h3>
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-600">Active Users:</span>
          <div class="flex -space-x-2">
            <div *ngFor="let user of activeUsers" 
                 class="relative inline-block" 
                 [title]="user.name">
              <img [src]="user.avatar || 'assets/default-avatar.png'" 
                   [alt]="user.name"
                   class="h-6 w-6 rounded-full ring-2 ring-white">
              <span class="absolute bottom-0 right-0 h-2 w-2 rounded-full" 
                    [ngClass]="{'bg-green-400': user.status === 'online', 
                               'bg-gray-300': user.status === 'offline'}"></span>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div *ngFor="let activity of activities" class="flex items-start space-x-3">
          <div [ngClass]="getActivityIconClass(activity.action)" 
               class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center">
            <i [class]="getActivityIcon(activity.action)" class="text-white"></i>
          </div>
          
          <div class="flex-grow">
            <p class="text-sm text-gray-800">
              <span class="font-medium">{{ activity.userId.name || 'Unknown User' }}</span>
              {{ getActivityText(activity) }}
            </p>
            <span class="text-xs text-gray-500">{{ activity.createdAt | date:'medium' }}</span>
          </div>
        </div>

        <div *ngIf="!activities.length" class="text-center text-gray-500 py-4">
          No recent activity
        </div>
      </div>
    </div>
  `
})
export class ActivityFeedComponent implements OnInit, OnDestroy {
  @Input() boardId: string = '';
  activities: Activity[] = [];
  activeUsers: ActiveUser[] = [];
  private subscriptions: Subscription[] = [];
  private currentUser: any = null;

  constructor(
    private webSocketService: WebSocketService,
    private authService: AuthService,
    private activityService: ActivityService
  ) {}

  private getUserId(user: any): string {
    // Handle both `_id` and `id` safely, fallback to empty string
    return user?._id ?? user?.id ?? '';
  }

  ngOnInit() {
    if (!this.boardId) return;

    const authSub = this.authService.getCurrentUser().subscribe(currentUser => {
      this.currentUser = currentUser;
      const token = localStorage.getItem('token');
      const userId = this.getUserId(currentUser);

      if (token && userId) {
        this.webSocketService.connect(token);
        this.webSocketService.joinBoard(this.boardId, {
          _id: userId,
          name: currentUser.name,
          email: currentUser.email,
          avatar: currentUser.avatar
        });
      }
    });

    this.subscriptions.push(authSub);

    this.activityService.getActivities(this.boardId).subscribe(
      (activities: Activity[]) => {
        this.activities = activities;
        console.log('ActivityFeedComponent: Initial activities loaded:', this.activities);
      },
      (error: any) => console.error('Error fetching activities:', error)
    );

    const activeUsersSub = this.webSocketService.getActiveUsers().subscribe(
      users => (this.activeUsers = users),
      error => console.error('Error getting active users:', error)
    );

    this.subscriptions.push(activeUsersSub);

    const activitiesSub = this.webSocketService.getActivities().subscribe(
      (activities: import('../../../../core/models/activity.model').Activity[]) => {
        this.activities = activities;
        console.log('ActivityFeedComponent: Real-time activities updated:', this.activities);
      },
      error => console.error('Error getting real-time activities:', error)
    );
    this.subscriptions.push(activitiesSub);
  }

  ngOnDestroy() {
    if (this.boardId && this.currentUser) {
      const userId = this.getUserId(this.currentUser);
      if (userId) {
        this.webSocketService.leaveBoard(this.boardId, userId);
      }
    }

    this.webSocketService.disconnect();
    this.subscriptions.forEach(sub => sub?.unsubscribe());
    this.activeUsers = [];
  }

  getActivityIconClass(action: string): string {
    switch (action) {
      case 'board_created': return 'bg-green-500';
      case 'board_updated': return 'bg-blue-500';
      case 'column_created': return 'bg-green-500';
      case 'column_updated': return 'bg-blue-500';
      case 'column_deleted': return 'bg-red-500';
      case 'task_created': return 'bg-green-500';
      case 'task_updated': return 'bg-blue-500';
      case 'task_moved': return 'bg-purple-500';
      case 'task_deleted': return 'bg-red-500';
      case 'user_joined_board': return 'bg-green-500';
      case 'user_left_board': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }

  getActivityIcon(action: string): string {
    switch (action) {
      case 'board_created': return 'fas fa-clipboard';
      case 'board_updated': return 'fas fa-edit';
      case 'column_created': return 'fas fa-columns';
      case 'column_updated': return 'fas fa-edit';
      case 'column_deleted': return 'fas fa-trash';
      case 'task_created': return 'fas fa-plus';
      case 'task_updated': return 'fas fa-edit';
      case 'task_moved': return 'fas fa-arrows-alt';
      case 'task_deleted': return 'fas fa-trash';
      case 'user_joined_board': return 'fas fa-user-plus';
      case 'user_left_board': return 'fas fa-user-minus';
      default: return 'fas fa-info';
    }
  }

  getActivityText(activity: Activity): string {
    const user = activity.userId.name || 'Unknown User';

    switch (activity.action) {
      case 'board_created': return `${user} created board "${activity.metadata?.title || 'Unknown Board'}"`;
      case 'board_updated': return `${user} updated board "${activity.metadata?.title || 'Unknown Board'}"`;
      case 'column_created': return `${user} created column "${activity.metadata?.title || 'Unknown Column'}"`;
      case 'column_updated': return `${user} updated column "${activity.metadata?.title || 'Unknown Column'}"`;
      case 'column_deleted': return `${user} deleted column "${activity.metadata?.title || 'Unknown Column'}"`;
      case 'task_created': return `${user} created task "${activity.details?.title || 'Unknown Task'}" in column "${activity.details?.columnTitle || 'Unknown Column'}"`;
      case 'task_updated': return `${user} updated task "${activity.details?.title || 'Unknown Task'}"`;
      case 'task_moved': return `${user} moved task "${activity.details?.title || 'Unknown Task'}" from "${activity.details?.sourceColumnTitle || 'Unknown Source Column'}" to "${activity.details?.destinationColumnTitle || 'Unknown Destination Column'}"`;
      case 'task_deleted': return `${user} deleted task "${activity.details?.title || 'Unknown Task'}" from column "${activity.details?.columnTitle || 'Unknown Column'}"`;
      case 'user_joined_board': return `${user} joined the board`;
      case 'user_left_board': return `${user} left the board`;
      default: return `${user} performed an action: ${activity.action}`;
    }
  }
}
