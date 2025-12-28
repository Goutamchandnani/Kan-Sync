import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { WebSocketService } from './websocket.service';
import { BoardService } from './board.service';
import { Task } from '../models/board.model';

interface TaskMovedPayload {
  taskId: string;
  sourceColumnId: string;
  destinationColumnId: string;
  sourceIndex: number;
  destinationIndex: number;
}

interface TaskMovedUpdate {
  type: 'task-moved';
  payload: TaskMovedPayload;
}

interface DragState {
  taskId: string | null;
  sourceColumnId: string | null;
  destinationColumnId: string | null;
  sourceIndex: number | null;
  destinationIndex: number | null;
  isSyncing: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DragDropService {
  private dragState = new BehaviorSubject<DragState>({
    taskId: null,
    sourceColumnId: null,
    destinationColumnId: null,
    sourceIndex: null,
    destinationIndex: null,
    isSyncing: false
  });

  private pendingMoves = new Map<string, DragState>();

  constructor(
    private webSocketService: WebSocketService,
    private boardService: BoardService
  ) {
    // Listen for task moved events from server
    this.webSocketService.onBoardUpdate().subscribe((update: TaskMovedUpdate | null) => {
      if (update?.type === 'task-moved') {
        this.handleTaskMovedEvent(update.payload);
      }
    });
  }

  // Start a drag operation
  startDrag(taskId: string, columnId: string, index: number) {
    this.dragState.next({
      ...this.dragState.value,
      taskId,
      sourceColumnId: columnId,
      sourceIndex: index,
      isSyncing: false
    });
  }

  // Handle drop with optimistic update
  async handleDrop(
    boardId: string,
    taskId: string,
    sourceColumnId: string,
    destinationColumnId: string,
    sourceIndex: number,
    destinationIndex: number
  ): Promise<boolean> {
    try {
      // Set syncing state
      this.dragState.next({
        taskId,
        sourceColumnId,
        destinationColumnId,
        sourceIndex,
        destinationIndex,
        isSyncing: true
      });

      // Store pending move
      this.pendingMoves.set(taskId, this.dragState.value);

      // Call API to update task position
      await firstValueFrom(
        this.boardService.moveTask(
          boardId,
          taskId,
          sourceColumnId,
          destinationColumnId,
          sourceIndex,
          destinationIndex
        )
      );

      // Emit WebSocket event
      this.webSocketService.emitTaskMoved(
        boardId,
        taskId,
        sourceColumnId,
        destinationColumnId,
        sourceIndex,
        destinationIndex
      );

      return true;
    } catch (error) {
      console.error('Error moving task:', error);
      // Revert optimistic update
      this.revertMove(taskId);
      return false;
    }
  }

  // Handle task moved event from server
  private handleTaskMovedEvent(event: any) {
    const {
      taskId,
      sourceColumnId,
      destinationColumnId,
      sourceIndex,
      destinationIndex
    } = event;

    // Clear pending move if it matches server response
    const pendingMove = this.pendingMoves.get(taskId);
    if (pendingMove &&
        pendingMove.sourceColumnId === sourceColumnId &&
        pendingMove.destinationColumnId === destinationColumnId &&
        pendingMove.sourceIndex === sourceIndex &&
        pendingMove.destinationIndex === destinationIndex) {
      this.pendingMoves.delete(taskId);
      this.dragState.next({
        ...this.dragState.value,
        isSyncing: false
      });
    } else {
      // Server state differs from client state, need to reconcile
      this.reconcileMove(event);
    }
  }

  // Revert a move that failed
  private revertMove(taskId: string) {
    const pendingMove = this.pendingMoves.get(taskId);
    if (pendingMove) {
      this.dragState.next({
        ...pendingMove,
        isSyncing: false
      });
      this.pendingMoves.delete(taskId);
    }
  }

  // Reconcile client state with server state
  private reconcileMove(serverState: any) {
    this.dragState.next({
      taskId: serverState.taskId,
      sourceColumnId: serverState.sourceColumnId,
      destinationColumnId: serverState.destinationColumnId,
      sourceIndex: serverState.sourceIndex,
      destinationIndex: serverState.destinationIndex,
      isSyncing: false
    });
  }

  // Get current drag state
  getDragState(): Observable<DragState> {
    return this.dragState.asObservable();
  }

  // Check if a task is currently syncing
  isTaskSyncing(taskId: string): boolean {
    return this.dragState.value.taskId === taskId && this.dragState.value.isSyncing;
  }
}