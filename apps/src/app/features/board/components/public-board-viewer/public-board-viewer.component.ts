import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BoardService } from '../../services/board.service';
import { Board, Column, Task } from '../../models/board.model';
import { Subscription } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CoreModule } from 'src/app/core/core.module';
import { Meta } from '@angular/platform-browser';
import { Socket } from 'ngx-socket-io';

@Component({
  selector: 'app-public-board-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    CoreModule
  ],
  templateUrl: './public-board-viewer.component.html',
  styleUrls: ['./public-board-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicBoardViewerComponent implements OnInit, OnDestroy {
  board: Board | null = null;
  loading: boolean = true;
  error: string | null = null;
  private publicId: string | null = null;
  private subscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private boardService: BoardService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private meta: Meta,
    private socket: Socket
  ) { }

  ngOnInit(): void {
    this.meta.addTag({ name: 'robots', content: 'noindex, nofollow' });
    this.subscription.add(this.route.paramMap.subscribe(params => {
      this.publicId = params.get('publicId');
      if (this.publicId) {
        this.loadPublicBoard();
        this.socket.emit('joinPublicBoard', this.publicId);
        this.setupSocketListeners();
      } else {
        this.error = 'Public board ID not provided.';
        this.loading = false;
        this.snackBar.open(this.error ?? 'An unknown error occurred.', 'Close', { duration: 5000 });
        this.cdr.detectChanges();
      }
    }));
  }

  loadPublicBoard(): void {
    if (!this.publicId) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.boardService.getPublicBoard(this.publicId).subscribe({
      next: (board) => {
        this.board = board;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading public board:', err);
        this.error = err.error?.message || 'Failed to load public board.';
        this.loading = false;
        this.snackBar.open(this.error ?? 'An unknown error occurred.', 'Close', { duration: 5000 });
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.publicId) {
      this.socket.emit('leavePublicBoard', this.publicId);
    }
    this.meta.removeTag('name="robots"');
  }

  getColumnTaskCount(column: Column): number {
    return (column?.tasks?.length) ?? 0;
  }

  getCategoryClass(category: string): string {
    switch(category?.toUpperCase()) {
      case 'BUG': return 'bg-red-100 text-red-800';
      case 'RESEARCH': return 'bg-amber-100 text-amber-800';
      case 'DESIGN': return 'bg-orange-100 text-orange-800';
      case 'DEV': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getPriorityDotClass(priority: string): string {
    switch(priority?.toUpperCase()) {
      case 'HIGH': return 'bg-red-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  }

  trackByColumnId(index: number, column: Column): string {
    return column._id;
  }

  trackByTaskId(index: number, task: Task): string {
    return task._id;
  }

  private setupSocketListeners(): void {
    this.subscription.add(this.socket.fromEvent('public-board:column-created').subscribe((data: any) => {
      if (this.board && data.boardId === this.board._id) {
        this.board.columns.push(data.column);
        this.cdr.detectChanges();
      }
    }));

    this.subscription.add(this.socket.fromEvent('public-board:task-created').subscribe((data: any) => {
      if (this.board && data.boardId === this.board._id) {
        const column = this.board.columns.find(c => c._id === data.columnId);
        if (column) {
          column.tasks.push(data.task);
          this.cdr.detectChanges();
        }
      }
    }));

    this.subscription.add(this.socket.fromEvent('public-board:task-updated').subscribe((data: any) => {
      if (this.board && data.boardId === this.board._id) {
        this.board.columns.forEach(column => {
          const taskIndex = column.tasks.findIndex(t => t._id === data.taskId);
          if (taskIndex > -1) {
            column.tasks[taskIndex] = data.task;
            this.cdr.detectChanges();
          }
        });
      }
    }));

    this.subscription.add(this.socket.fromEvent('public-board:task-deleted').subscribe((data: any) => {
      if (this.board && data.boardId === this.board._id) {
        this.board.columns.forEach(column => {
          column.tasks = column.tasks.filter(t => t._id !== data.taskId);
          this.cdr.detectChanges();
        });
      }
    }));

    this.subscription.add(this.socket.fromEvent('public-board:task-moved').subscribe((data: any) => {
      if (this.board && data.boardId === this.board._id) {
        const sourceColumn = this.board.columns.find(c => c._id === data.sourceColumnId);
        const destinationColumn = this.board.columns.find(c => c._id === data.destinationColumnId);

        if (sourceColumn && destinationColumn) {
          const taskIndex = sourceColumn.tasks.findIndex(t => t._id === data.taskId);
          if (taskIndex > -1) {
            const [task] = sourceColumn.tasks.splice(taskIndex, 1);
            // Update the task with the new data from the event
            Object.assign(task, data.task);
            destinationColumn.tasks.splice(data.destinationIndex, 0, task);
            this.cdr.detectChanges();
          }
        }
      }
    }));

    this.subscription.add(this.socket.fromEvent('public-board:column-updated').subscribe((data: any) => {
      if (this.board && data.boardId === this.board._id) {
        const columnIndex = this.board.columns.findIndex(c => c._id === data.column._id);
        if (columnIndex > -1) {
          this.board.columns[columnIndex] = data.column;
          this.cdr.detectChanges();
        }
      }
    }));

    this.subscription.add(this.socket.fromEvent('public-board:column-deleted').subscribe((data: any) => {
      if (this.board && data.boardId === this.board._id) {
        this.board.columns = this.board.columns.filter(c => c._id !== data.columnId);
        this.cdr.detectChanges();
      }
    }));
  }
}
