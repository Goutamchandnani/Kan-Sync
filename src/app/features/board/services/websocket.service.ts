import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { ActiveUser, Task } from '../models/board.model';
import { Activity } from '../../../core/models/activity.model';
import { environment } from '../../../../environments/environment';
import { Store } from '@ngrx/store';
import * as BoardActions from '../../../store/actions/board.actions';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private heartbeatInterval: Subscription | null = null;
  private activeUsers$ = new BehaviorSubject<ActiveUser[]>([]);
  private activities$ = new BehaviorSubject<Activity[]>([]);
  public boardUpdate$ = new BehaviorSubject<any>(null);
  private taskUpdate$ = new BehaviorSubject<any>(null);
  private columnUpdate$ = new BehaviorSubject<any>(null);
  private memberAdded$ = new BehaviorSubject<any>(null);
  private presenceUpdate$ = new BehaviorSubject<any>(null);
  private attachmentUploadProgress$ = new BehaviorSubject<{ taskId: string, progress: number } | null>(null);
  private connectionStatus = new BehaviorSubject<boolean>(false);

  onMemberAdded(): Observable<any> {
    return this.memberAdded$.asObservable();
  }

  onPresenceUpdate(): Observable<any> {
    return this.presenceUpdate$.asObservable();
  }

  onAttachmentUploadProgress(): Observable<{ taskId: string, progress: number } | null> {
    return this.attachmentUploadProgress$.asObservable();
  }

  constructor(private store: Store) {
    this.setupSocketListeners = this.setupSocketListeners.bind(this);
  }

  connect(token: string) {
    if (this.socket) {
      this.disconnect();
    }
    this.socket = io(environment.wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    this.setupSocketListeners();
    this.startHeartbeat();
  }

  private startHeartbeat() {
    this.stopHeartbeat(); // Ensure no duplicate heartbeats
    this.heartbeatInterval = interval(25000).subscribe(() => { // Emit heartbeat every 25 seconds
      if (this.socket && this.socket.connected) {
        this.socket.emit('heartbeat');
        console.log('Heartbeat emitted');
      }
    });
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      this.heartbeatInterval.unsubscribe();
      this.heartbeatInterval = null;
      console.log('Heartbeat stopped');
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.connectionStatus.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.connectionStatus.next(false);
      this.stopHeartbeat();
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('WebSocket connection error:', error);
      this.connectionStatus.next(false);
    });

    // User presence events
    this.socket.on('users-updated', (users: ActiveUser[]) => {
      console.log('Active users updated:', users);
      this.activeUsers$.next(users);
    });

    // Activity events
    this.socket.on('activity:created', (activity: Activity) => {
      console.log('Activity created (WebSocketService) - Raw:', activity);
      // Append new activity to the existing list
      const currentActivities = this.activities$.getValue();
      this.activities$.next([activity, ...currentActivities]);
      console.log('Activity created (WebSocketService) - Updated activities$:', this.activities$.getValue());
    });

    // Board events
    this.socket.on('board-updated', (board: any) => {
      console.log('Board updated:', board);
      this.boardUpdate$.next(board);
    });

    this.socket.on('board:member-added', (data: any) => {
      console.log('board:member-added received:', data);
      if (data) {
        this.memberAdded$.next(data);
      } else {
        console.warn('board:member-added received null or undefined data.');
      }
    });

    this.socket.on('presence-update', (data: any) => {
      console.log('presence-update received:', data);
      if (data) {
        this.presenceUpdate$.next(data);
      } else {
        console.warn('presence-update received null or undefined data.');
      }
    });

    // Task events
    this.socket.on('task:created', (data: any) => {
      console.log('WebSocketService: task:created event received - Raw:', data);
      this.taskUpdate$.next({ type: 'created', ...data });
      console.log('WebSocketService: taskUpdate$ emitted for created task', this.taskUpdate$.getValue());
    });

    this.socket.on('task:updated', (data: any) => {
      console.log('Task updated:', data);
      this.taskUpdate$.next({ type: 'updated', ...data });
    });

    this.socket.on('task:moved', (data: any) => {
      console.log('Task moved:', data);
      this.taskUpdate$.next({ type: 'moved', ...data });
    });

    this.socket.on('task:deleted', (data: any) => {
      console.log('Task deleted:', data);
      this.taskUpdate$.next({ type: 'deleted', ...data });
    });

    this.socket.on('column:created', (data: any) => {
      console.log('WebSocketService: column:created event received, emitting via columnUpdate$.next():', data);
      this.columnUpdate$.next({ type: 'created', ...data });
    });
    console.log('WebSocketService: column:created listener registered.');

    this.socket.on('attachmentUploadProgress', (data: { taskId: string, progress: number }) => {
      console.log('Attachment upload progress:', data);
      this.attachmentUploadProgress$.next(data);
    });

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Board room management
  joinBoard(boardId: string, user: { _id: string; name: string; email: string; avatar?: string }) {
    if (this.socket) {
      const callId = Math.random().toString(36).substring(7);
      console.log(`[${callId}] Joining board:`, boardId, 'as user:', user);
      this.socket.emit('join-board', { boardId, user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
    }
  }

  leaveBoard(boardId: string, userId: string) {
    if (this.socket) {
      console.log('Leaving board:', boardId, 'user:', userId);
      this.socket.emit('leave-board', { boardId, userId });
    }
  }

  // Task operations
  emitTaskCreated(boardId: string, task: Task, columnId: string) {
    if (this.socket) {
      this.socket.emit('task-created', { boardId, task, columnId });
    }
  }

  emitTaskUpdated(boardId: string, task: Task) {
    if (this.socket) {
      this.socket.emit('task-updated', { boardId, task });
    }
  }

  emitTaskMoved(boardId: string, taskId: string, sourceColumnId: string, destinationColumnId: string, sourceIndex: number, destinationIndex: number) {
    if (this.socket) {
      this.socket.emit('task-moved', {
        boardId,
        taskId,
        sourceColumnId,
        destinationColumnId,
        sourceIndex,
        destinationIndex
      });
    }
  }

  emitTaskDeleted(boardId: string, taskId: string) {
    if (this.socket) {
      this.socket.emit('task-deleted', { boardId, taskId });
    }
  }

  emitColumnCreated(boardId: string, column: any) {
    if (this.socket) {
      this.socket.emit('column-created', { boardId, column });
    }
  }
  // Activity operations
  emitActivityCreated(boardId: string, activity: Activity) {
    if (this.socket) {
      this.socket.emit('activity-created', { boardId, activity });
    }
  }

  // Board operations
  emitBoardUpdated(boardId: string, board: any) {
    if (this.socket) {
      this.socket.emit('board-updated', { boardId, board });
    }
  }

  emitMemberAdded(boardId: string, member: any) {
    if (this.socket) {
      this.socket.emit('board:member-added', { boardId, member });
    }
  }

  emitPresenceUpdate(boardId: string, userId: string, status: 'online' | 'offline') {
    if (this.socket) {
      this.socket.emit('presence-update', { boardId, userId, status });
    }
  }

  isUserOnline(userId: string): boolean {
    return this.activeUsers$.getValue().some(user => user._id === userId);
  }

  getActiveUsers(): Observable<ActiveUser[]> {
    return this.activeUsers$.asObservable();
  }

  getActivities(): Observable<Activity[]> {
    return this.activities$.asObservable();
  }

  getBoardUpdateListener(): Observable<any> {
    return this.boardUpdate$.asObservable();
  }

  getTaskUpdateListener(): Observable<any> {
    return this.taskUpdate$.asObservable();
  }

  getColumnUpdateListener(): Observable<any> {
    return this.columnUpdate$.asObservable();
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus.asObservable();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}