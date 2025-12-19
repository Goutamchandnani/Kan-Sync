import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserPresence } from '../../../../core/models/presence.model';

@Component({
  selector: 'app-active-users',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Active Users</h3>
        <div class="text-sm text-gray-500">
          {{ users.length }} online
        </div>
      </div>

      <div class="space-y-3">
        <div *ngFor="let user of users" 
             class="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
          <!-- User Avatar with Status Indicator -->
          <div class="relative">
            <img [src]="user.avatar || 'assets/default-avatar.png'"
                 [alt]="user.name"
                 class="w-8 h-8 rounded-full">
            <span class="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full"
                  [class.bg-green-400]="user.status === 'online'"
                  [class.bg-gray-300]="user.status === 'offline'">
            </span>
          </div>

          <!-- User Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">
              {{ user.name }}
            </p>
            <p class="text-xs text-gray-500 truncate">
              {{ user.status === 'online' ? 'Active now' : getLastSeen(user.lastSeen) }}
            </p>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!users.length" class="text-center py-4">
          <p class="text-sm text-gray-500">
            No users currently active
          </p>
        </div>
      </div>
    </div>
  `
})
export class ActiveUsersComponent {
  @Input() boardId!: string;
    @Input() set activeUsers(value: UserPresence[]) {
    this._activeUsers = value || [];
  }
  get activeUsers(): UserPresence[] {
    return this._activeUsers;
  }

  private _activeUsers: UserPresence[] = [];

  get users(): UserPresence[] {
    const sortedUsers = this._activeUsers
      .sort((a: UserPresence, b: UserPresence) => {
        // Sort online users first, then by name
        if (a.status === b.status) {
          const nameA = a.name || '';
          const nameB = b.name || '';
          return nameA.localeCompare(nameB);
        }
        const statusA = a.status || '';
        const statusB = b.status || '';
        return statusA === 'online' ? -1 : 1;
      });
    return sortedUsers;
        }

  getLastSeen(lastSeen?: string): string {
    if (!lastSeen) return 'Unknown';
    
    const lastSeenDate = new Date(lastSeen);

    // Check if the date is valid
    if (isNaN(lastSeenDate.getTime())) {
      return 'Invalid Date'; // Or handle as appropriate
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return lastSeenDate.toLocaleDateString();
  }
}