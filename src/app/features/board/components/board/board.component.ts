import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule } from '@angular/cdk/drag-drop';
import { Store } from '@ngrx/store';
import * as AuthActions from '../../../../store/actions/auth.actions';
import { loadBoards, createBoard } from '../../../../store/actions/board.actions';
import { selectAllBoards } from '../../../../store/selectors/board.selectors';
import { Board, Column, Task, ActiveUser } from '../../models/board.model';
import { BoardService } from '../../services/board.service';
import { WebSocketService } from '../../services/websocket.service';
import { AuthService } from '../../../auth/services/auth.service';
import { TaskModalComponent } from '../task-modal/task-modal.component';
import { ActivityFeedComponent } from '../activity-feed/activity-feed.component';
import { ActiveUsersComponent } from '../active-users/active-users.component';
import { DragDropService } from '../../services/drag-drop.service';
import { Subscription, take, combineLatest, BehaviorSubject, Observable } from 'rxjs';
import { CoreModule } from 'src/app/core/core.module';
import { Subject } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';
import { AddUserModalComponent } from '../add-user-modal/add-user-modal.component';
import { RemoveUserModalComponent } from '../remove-user-modal/remove-user-modal.component';
import { distinctUntilChanged, switchMap, takeUntil, map, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface BoardTokenParams {
  boardId: string | null;
  token: string | null;
}



@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DragDropModule,
    MatDialogModule,
    MatSnackBarModule,
    TaskModalComponent,
    ActivityFeedComponent,
    ActiveUsersComponent,
    AddUserModalComponent,
    CoreModule,
    RouterModule
  ],
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss']
})
export class BoardComponent implements OnInit, OnDestroy {
  board!: Board;
  boardId!: string;
  boards$: Observable<Board[]>;
  connectionStatus$: Observable<boolean>;
  connectedColumns: string[] = [];
  private destroy$ = new Subject<void>();

  columnForm: FormGroup;
  selectedTask: Task | null = null;
  selectedColumn: Column | null = null;
  isCreatingTask = false;
  loading = true;
  error: string | null = null;
  isPublicSharingEnabled: boolean = false;
  publicShareLink: string = '';
  sharingLoading: boolean = false;
  addColumnLoading: boolean = false;
  deleteTaskLoading: boolean = false;
  createTaskLoading: boolean = false;
  taskDropLoading: boolean = false;

  private subscriptions: Subscription[] = [];
  private columnLists: string[] = [];
  private taskLoadingStates: Record<string, boolean> = {};
  showCreateForm = false;
  createBoardForm!: FormGroup;
  showActivitySidebar = false;


  constructor(
    private boardService: BoardService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private webSocketService: WebSocketService,
    private authService: AuthService,
    private store: Store,
    private dragDropService: DragDropService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {
    this.columnForm = this.fb.group({
      title: ['', Validators.required]
    });
    this.createBoardForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]]
    });
    this.connectionStatus$ = this.webSocketService.getConnectionStatus();
    this.boards$ = this.store.select(selectAllBoards);
  }

  onCreateBoard() {
    if (this.createBoardForm.valid) {
      this.store.dispatch(createBoard({ title: this.createBoardForm.value.title }));
      this.showCreateForm = false;
      this.createBoardForm.reset();
    }
  }

  ngOnInit() {
    this.store.dispatch(loadBoards());
    console.log('BoardComponent ngOnInit called.');
    console.log('BoardComponent initializing...');
    // Get the board ID from the route
    this.subscriptions.push(
      combineLatest([
        this.route.params.pipe(
          tap((params: any) => console.log('route.params emitted:', params)),
          map(params => params['id']),
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        ),
        this.authService.getCurrentUser().pipe(
          tap((user: any) => console.log('authService.getCurrentUser() emitted:', user)),
          distinctUntilChanged((prev: any, curr: any) => prev?._id === curr?._id),
          takeUntil(this.destroy$)
        )
      ]).subscribe(([boardId, currentUser]) => {
        console.log('combineLatest subscription - BoardId:', boardId, 'CurrentUser:', currentUser);
        console.log('combineLatest subscription - Previous BoardId:', this.boardId, 'Previous CurrentUser:', this.authService.getCurrentUser());
        if (boardId && currentUser) {
          console.log('Condition (boardId && currentUser) is true.');
          this.boardId = boardId;
          const userId = (currentUser as any)._id ?? (currentUser as any).id;
          const activeUser: ActiveUser = {
            _id: userId,
            name: (currentUser as any).name,
            email: (currentUser as any).email,
            avatar: (currentUser as any).avatar || 'assets/default-avatar.png',
            status: 'online'
          };

          // Ensure WebSocket connection is established only once
          const maybeToken = (this.authService as any).getToken?.();
          let token: string | null = null;

          if (typeof maybeToken === 'string') {
            token = maybeToken;
          } else if (maybeToken && typeof (maybeToken as any).subscribe === 'function') {
            // This case should ideally be handled by the authService.getCurrentUser() or a separate token observable
            // For now, we'll assume getToken() returns a string or is handled elsewhere.
            // If getToken() returns an observable, it should be part of the combineLatest.
            console.warn('authService.getToken() returned an observable, which is not directly handled here. Ensure token is available.');
          }

          if (token && token.trim()) {
            if (!this.webSocketService.isConnected()) {
              console.log('BoardComponent: Attempting to connect to WebSocket with token...');
              this.webSocketService.connect(token);
              console.log('BoardComponent: WebSocket connect method called.');
            } else {
              console.log('BoardComponent: WebSocket already connected, skipping connect call.');
            }
          } else {
            console.error('No auth token available, or token is empty. Cannot establish WebSocket connection.');
          }

          this.loadBoard();
          console.log('BoardComponent: Preparing to call joinBoard with boardId:', this.boardId, 'and user:', activeUser._id);
          this.webSocketService.joinBoard(this.boardId, activeUser);
          console.log('Attempting to show toastr notification.');

        } else if (!boardId) {
          console.error('No boardId available from route parameters.');
        } else if (!currentUser) {
          console.error('No current user available for joining the board.');
        }
      }),
      this.connectionStatus$.subscribe(isConnected => {
        console.log('WebSocket connection status:', isConnected ? 'Connected' : 'Disconnected');
        // You can update UI elements here based on connection status
      })
    );

    // These subscriptions should be outside the combineLatest to avoid re-subscribing
    // every time route params or user changes.
    const memberAddedSub = this.webSocketService.onMemberAdded().subscribe((data: any) => {
      console.log('board:member-added received:', data);
      if (data.boardId === this.boardId && data.member) {
        if (!this.board.members) {
          this.board.members = [];
        }
        if (!this.board.members.some(m => m._id === data.member._id)) {
          this.board.members.push(data.member);
          this.cdr.detectChanges();
          this.snackBar.open(`User ${data.member.email} added to board.`, 'Close', { duration: 3000 });
        }
      }
    });

    const presenceUpdateSub = this.webSocketService.onPresenceUpdate().subscribe((data) => {
      console.log('BoardComponent: Before presence update, activeUsers:', this.board?.activeUsers);
      if (this.board && data && data.users) {
        this.board.activeUsers = [...data.users];
        console.log('BoardComponent: After presence update, activeUsers:', this.board.activeUsers);
        this.cdr.detectChanges();
      }
    });

    const boardUpdateSub = this.webSocketService.getBoardUpdateListener().subscribe((board) => {
      if (board && this.board && board._id === this.boardId) {
        console.log('BoardComponent: board-updated event received', board);
        this.board = { ...this.board, ...board };
        this.cdr.detectChanges();
      }
    });

    const columnUpdateSub = this.webSocketService.getColumnUpdateListener().subscribe((update) => {
      if (!this.board) return;

      const { type, boardId, column } = update;

      if (boardId !== this.boardId) return; // Only process updates for the current board

      switch (type) {
        case 'created':
          console.log('Column created event received, reloading board:', update);
          this.loadBoard();
          break;
        case 'deleted':
          console.log('Column deleted event received:', update);
          this.board.columns = this.board.columns.filter(col => col._id !== column._id);
          this.connectedColumns = this.board.columns.map(col => col._id);
          this.snackBar.open(`Column "${column.title}" deleted.`, 'Close', { duration: 3000 });
          this.toastr.info('A column was deleted.');
          this.loadBoard();
          this.cdr.detectChanges();
          break;
      }
    });
    console.log('columnUpdateSub created and pushed to subscriptions.');
    this.subscriptions.push(memberAddedSub, presenceUpdateSub, boardUpdateSub, columnUpdateSub);

    const taskUpdateSub = this.webSocketService.getTaskUpdateListener().subscribe((update: any) => {
      if (!this.board) return;

      const { type, boardId, taskId, columnId, task, sourceColumnId, destinationColumnId, sourceIndex, destinationIndex } = update;

      if (boardId !== this.boardId) return; // Only process updates for the current board

      switch (type) {
          case 'created':
            console.log('Task created event received:', update);
            console.log('BoardComponent: activeUsers before task creation update:', this.board.activeUsers);
            const targetColumnForCreate = this.board.columns.find(col => {
              const colId = (col as any)._id ?? (col as any).id;
              return colId === columnId;
            });
            if (targetColumnForCreate && task) {
              targetColumnForCreate.tasks.push(task);
              this.cdr.detectChanges();
              console.log('BoardComponent: activeUsers after task creation update:', this.board.activeUsers);
            } else {
              console.warn('Target column not found or task is null for created event.');
            }
            break;
        case 'updated':
          // Find the task and update it. If column changed, move it.
          let found = false;
          const taskStatus = (task as any).status;

          let targetColumnId: string | undefined;

          // Find the column ID based on the task's status
          const targetColumnForUpdate = this.board.columns.find(col => col.title.toLowerCase() === taskStatus.toLowerCase());
          if (targetColumnForUpdate) {
            targetColumnId = targetColumnForUpdate._id;
          }
          this.board = {
            ...this.board,
            columns: this.board.columns.map(col => {
              const taskIndex = col.tasks.findIndex(t => ((t as any)._id ?? (t as any).id) === taskId);
              if (taskIndex > -1) {
                if (col._id === targetColumnId) { // Task updated within the same column
                  found = true;
                  return {
                    ...col,
                    tasks: col.tasks.map(t => (((t as any)._id ?? (t as any).id) === taskId) ? { ...task } : t)
                  };
                } else { // Task moved to a different column during update
                  return {
                    ...col,
                    tasks: col.tasks.filter(t => ((t as any)._id ?? (t as any).id) !== taskId)
                  };
                }
              }
              return col;
            })
          };

          if (!found && targetColumnId && task) { // Add to new column if it was moved
            this.board = {
              ...this.board,
              columns: this.board.columns.map(col => {
                if (((col as any)._id ?? (col as any).id) === targetColumnId) {
                  return {
                    ...col,
                    tasks: [...col.tasks, task]
                  };
                }
                return col;
              })
            };
          }
          this.cdr.detectChanges();
          break;
        case 'moved':
          const sourceCol = this.board.columns.find(col => ((col as any)._id ?? (col as any).id) === sourceColumnId);
          const destCol = this.board.columns.find(col => ((col as any)._id ?? (col as any).id) === destinationColumnId);

          if (sourceCol && destCol) {
            const movedTaskIndex = sourceCol.tasks.findIndex(t => ((t as any)._id ?? (t as any).id) === taskId);
            if (movedTaskIndex > -1) {
              const [movedTask] = sourceCol.tasks.splice(movedTaskIndex, 1);
              if (movedTask) {
                destCol.tasks.splice(destinationIndex, 0, movedTask);
                movedTask.status = destCol.title; // Assuming status is column title
              }
            }
            this.cdr.detectChanges();
          }
          break;
        case 'deleted':
  const deletedTaskStatus = update.taskStatus;
  const targetColumn = this.board.columns.find(col => col.title.toLowerCase() === deletedTaskStatus.toLowerCase());
  if (targetColumn) {
    targetColumn.tasks = targetColumn.tasks.filter(t => ((t as any)._id ?? (t as any).id) !== taskId);
    this.cdr.detectChanges();
  }
  break;
      }
    });
    this.subscriptions.push(taskUpdateSub);


  }

  ngOnDestroy() {
    console.log('BoardComponent ngOnDestroy called.');
    if (this.boardId) {
      // take(1) so we don't leak
      this.authService.getCurrentUser().pipe(take(1)).subscribe(currentUser => {
        if (currentUser) {
          const id = (currentUser as any)._id ?? (currentUser as any).id;
          if (id) {
            this.webSocketService.leaveBoard(this.boardId, id);
          }
        }
      });
      this.webSocketService.disconnect();
    }

    this.subscriptions.forEach(sub => sub?.unsubscribe());
    this.destroy$.next();
    this.destroy$.complete();

  }

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }



  getColumnId(column: Column): string {
    return column._id || '';
  }

  onDeleteColumn(columnId: string): void {
    if (confirm('Are you sure you want to delete this column and all its tasks?')) {
      if (this.boardId) {
        this.boardService.deleteColumn(this.boardId, columnId).subscribe({
          next: () => {
            this.toastr.success('Column deleted successfully!');
            this.loadBoard(); // Reload the board to reflect changes
          },
          error: (err: any) => {
            this.toastr.error('Failed to delete column.');
            console.error('Delete column error:', err);
          }
        });
      }
    }
  }

  trackByColumnId(index: number, column: Column): string {
    return column._id;
  }

  trackByTaskId(index: number, task: Task): string {
    return task._id;
  }





  /** Template expects onTaskDrop */
  getPriorityColorClass(priority: string): string {
    switch (priority) {
      case 'High':
        return 'bg-red-500';
      case 'Medium':
        return 'bg-yellow-500';
      case 'Low':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  }

  onTaskDrop(event: CdkDragDrop<{ columnId: string; tasks: Task[] }>) {
    console.log('onTaskDrop event fired:', event);
    if (!this.board) return;

    const task = event.item.data as Task;
    const taskId = (task as any)._id ?? (task as any).id;
    const sourceColumnId = event.previousContainer.data.columnId;
    const destinationColumnId = event.container.data.columnId;

    if (!taskId || !sourceColumnId || !destinationColumnId) {
      console.error('Missing task or column IDs for drag and drop');
      return;
    }

    // Optimistically update UI
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data.tasks, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data.tasks,
        event.container.data.tasks,
        event.previousIndex,
        event.currentIndex,
      );
    }

    // Call DragDropService to handle the drop, which includes API call and WebSocket emit
    this.taskDropLoading = true;
    this.dragDropService.handleDrop(
      this.boardId,
      taskId,
      sourceColumnId,
      destinationColumnId,
      event.previousIndex,
      event.currentIndex
    ).then(success => {
      if (!success) {
        // If handleDrop returns false, it means an error occurred and the move was reverted
        // We might need to re-load the board to ensure UI consistency
        this.snackBar.open('Failed to move task. Reverting changes.', 'Close', { duration: 3000 });
        this.loadBoard();
      }
      this.taskDropLoading = false;
    }).catch(error => {
      console.error('Error during task drop:', error);
      this.snackBar.open('An unexpected error occurred during task move.', 'Close', { duration: 3000 });
      this.loadBoard(); // Revert UI on unexpected error
      this.taskDropLoading = false;
    });
  }

  /** Accepts various user shapes (BoardMember, ActiveUser, etc.) */
  isUserOnline(user: any): boolean {
    const id = (user as any)._id ?? (user as any).id;
    if (!id) return false;
    return this.webSocketService.isUserOnline(id);
  }

  /** Open modal for create/edit */
  openTaskModal(task: Task | null, column: Column) {
    console.log('Opening task modal for task:', task);
    console.log('Associated column:', column);
    this.selectedTask = task ? { ...task } : null;
    this.selectedColumn = column;
    this.isCreatingTask = task === null;
  }

  closeTaskModal(deleted: boolean = false) {
    console.log('closeTaskModal called, deleted:', deleted);
    this.selectedTask = null;
    this.selectedColumn = null;
    this.isCreatingTask = false;
    if (deleted) {
      this.loadBoard();
    }
  }

  loadBoard() {
    if (!this.boardId) {
      console.error('No boardId available');
      return;
    }
    this.loading = true;
    console.log('loadBoard() called. Board ID:', this.boardId);
    this.boardService.getBoard(this.boardId).subscribe(
      (board) => {
        console.log('Board data received:', board);
              this.board = board;
        console.log('BoardComponent: activeUsers initialized in loadBoard:', this.board.activeUsers);
        this.connectedColumns = this.board.columns.map(column => column._id);
              this.cdr.detectChanges();
        if (!this.board.columns) {
          console.warn('Board has no columns array');
          this.board.columns = [];
        }
        // Initialize public sharing status
        this.isPublicSharingEnabled = board.isPubliclyShareable ?? false;
        this.publicShareLink = board.isPubliclyShareable && board.publicId ? `${window.location.origin}/public/board/${board.publicId}` : '';

        console.log('Board after update:', this.board);
        this.loading = false;
        this.error = null;
      },
      (error) => {
        console.error('Error loading board:', error);
        this.loading = false;
        this.error = error.message;
      }
    );
  }

  /** Safe getter for task count */
  getColumnTaskCount(column: Column): number {
    return (column?.tasks?.length) ?? 0;
  }

  togglePublicSharing(): void {
    if (!this.boardId) return;
    this.sharingLoading = true;
    this.boardService.togglePublicSharing(this.boardId, !this.isPublicSharingEnabled).subscribe({
      next: (board: Board) => {
        this.board = board;
        this.isPublicSharingEnabled = board.isPubliclyShareable ?? false;
        this.publicShareLink = board.publicShareLink || '';
        this.snackBar.open(`Public sharing ${this.isPublicSharingEnabled ? 'enabled' : 'disabled'}.`, 'Close', { duration: 3000 });
        this.sharingLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error toggling public sharing:', err);
        this.snackBar.open('Failed to toggle public sharing.', 'Close', { duration: 3000 });
        this.sharingLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  copyShareLink(): void {
    if (this.publicShareLink) {
      navigator.clipboard.writeText(this.publicShareLink).then(() => {
        this.snackBar.open('Public share link copied to clipboard!', 'Close', { duration: 3000 });
      }).catch(err => {
        console.error('Failed to copy link:', err);
        this.snackBar.open('Failed to copy link.', 'Close', { duration: 3000 });
      });
    }
  }

  /** Called when a task is deleted from modal (uses selectedTask & selectedColumn) */


  onTaskDelete() {
    if (!this.selectedTask || !this.selectedColumn || !this.board) {
      console.error('Cannot delete task: Missing required data');
      return;
    }

    const taskId = (this.selectedTask as any)._id ?? (this.selectedTask as any).id;
    if (!taskId) {
      console.error('Cannot delete task: missing id');
      return;
    }

    if (!this.boardId) {
      console.error('Board ID is null, cannot delete task');
      return;
    }
    this.deleteTaskLoading = true;
    this.boardService.deleteTask(this.boardId, taskId, this.selectedColumn._id).subscribe(
      () => {
        // Task deletion is handled by WebSocket events, no need to reload the entire board
        this.selectedTask = null;
        this.selectedColumn = null;
        this.isCreatingTask = false;
        this.deleteTaskLoading = false;
        this.snackBar.open('Task deleted successfully!', 'Close', { duration: 3000 });
      },
      error => {
        console.error('Error deleting task:', error);
        this.deleteTaskLoading = false;
        this.snackBar.open('Failed to delete task.', 'Close', { duration: 3000 });
      }
    );
  }

  onAddColumn() {
    if (!this.columnForm.valid) {
      console.error('Column form is invalid');
      return;
    }

    if (!this.board || !this.boardId) {
      console.error('No board or boardId available');
      return;
    }

    const title = this.columnForm.get('title')?.value;
    if (!title) {
      console.error('No title provided for new column');
      return;
    }

    this.addColumnLoading = true;
    this.boardService.addColumn(this.boardId, title).subscribe({
      next: (updatedBoard: Board) => {
        this.board = updatedBoard;
        this.connectedColumns = this.board.columns.map(column => column._id);
        this.columnForm.reset();
        this.addColumnLoading = false;
        this.cdr.detectChanges();
        this.webSocketService.emitColumnCreated(this.boardId, updatedBoard.columns[updatedBoard.columns.length - 1]);
      },
      error: (err) => {
        console.error('Error adding column:', err);
        this.snackBar.open('Failed to add column.', 'Close', { duration: 3000 });
        this.addColumnLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openAddUserModal(): void {
    const dialogRef = this.dialog.open(AddUserModalComponent, {
      width: '400px',
      data: { boardId: this.boardId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const userEmail = result;
        this.boardService.addMember(this.boardId, userEmail).subscribe({
          next: (updatedBoard) => {
            this.board = updatedBoard;
            console.log('User added to board:', userEmail);
            this.snackBar.open(`User ${userEmail} added to board successfully!`, 'Close', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error adding user to board:', error);
            const errorMessage = error.error?.message || 'Failed to add user.';
            this.snackBar.open(errorMessage, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        });
      }
    });
  }

  openRemoveUserModal(): void {
    if (!this.boardId) {
      this.snackBar.open('Board ID is not available.', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(RemoveUserModalComponent, {
      width: '400px',
      data: { boardId: this.boardId },
      panelClass: 'remove-user-dialog-panel' // Add a custom panel class
    });

    dialogRef.afterClosed().subscribe(userId => {
      if (userId) {
        this.boardService.removeMember(this.boardId, userId).subscribe({
          next: (updatedBoard) => {
            this.board = updatedBoard;
            console.log('User removed from board:', userId);
            this.snackBar.open('User removed from board successfully!', 'Close', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error removing user from board:', error);
            const errorMessage = error.error?.message || 'Failed to remove user.';
            this.snackBar.open(errorMessage, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        });
      }
    });
  }
}