import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, BoardMember, Attachment, Comment, Column, GeminiSuggestion } from '../../models/board.model';
import { Activity } from '../../../../core/models/activity.model';
import { TaskService } from '../../services/task.service';
import { BoardService } from '../../services/board.service';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../auth/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { AttachmentErrorDialogComponent } from '../attachment-error-dialog/attachment-error-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { WebSocketService } from '../../services/websocket.service';

// Add User interface if not already imported
interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './task-modal.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class TaskModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() column: Column | null = null;
  @Input() boardId!: string;
  @Input() boardMembers: BoardMember[] = [];
  @Input() boardColumns: Column[] = [];
  @Input() task: Task | null = null;
  @Output() close = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<Partial<Task>>();
  @Output() delete = new EventEmitter<void>();

  taskForm!: FormGroup;
  commentForm!: FormGroup;
  isCreatingTask = false;
  comments: Comment[] = [];
  uploadProgress: number = 0;
  minDate: string = new Date().toISOString().split('T')[0];
  attachments: Attachment[] = [];
  isSaving: boolean = false;
  currentUser: User | null = null;
  private subscriptions = new Subscription();
  isLoadingSuggestions: boolean = false;
  geminiSuggestions: GeminiSuggestion | null = null;

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private boardService: BoardService,
    private authService: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private websocketService: WebSocketService,
    private dialog: MatDialog
  ) {
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      status: ['', Validators.required],
      priority: ['medium', Validators.required],
      assignedTo: [null],
      tags: [[]],
      deadline: [null]
    });
    this.commentForm = this.fb.group({
      content: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe((user: User) => {
      this.currentUser = user;
    });

    if (this.task) {
        console.log('Task in ngOnInit:', this.task);
        console.log('Gemini Suggestions in ngOnInit:', this.task.geminiSuggestions);
        this.isCreatingTask = false;
        this.taskForm.patchValue({
          title: this.task.title,
          description: this.task.description,
          status: this.task.status,
          priority: this.task.priority,
          assignedTo: (this.task.assignedTo && typeof this.task.assignedTo === 'object') ? this.task.assignedTo._id : this.task.assignedTo || null,
          tags: this.task.tags,
          deadline: this.task.deadline ? new Date(this.task.deadline).toISOString().split('T')[0] : null
        });
        if (this.task._id) {
          this.loadAttachments(this.boardId, this.task._id);
          this.loadComments(this.boardId, this.task._id);
        }
        if (this.task.geminiSuggestions) {
          this.geminiSuggestions = this.task.geminiSuggestions;
        }
      } else {
        this.isCreatingTask = true;
        if (this.column) {
          this.taskForm.get('status')?.setValue(this.column.title);
        }
      }

    this.boardService.getBoardMembers(this.boardId).subscribe((members: BoardMember[]) => {
      this.boardMembers = members;
    });

    this.boardService.getBoardColumns(this.boardId).subscribe((columns: Column[]) => {
      this.boardColumns = columns;
      if (!this.taskForm.get('status')?.value && columns.length > 0) {
        this.taskForm.get('status')?.setValue(columns[0].title);
      }
    });

    this.subscriptions.add(
      this.websocketService.getActivities().subscribe((activities: Activity[]) => {
        if (this.task?._id) {
          const taskId = this.task._id;
          activities.forEach(activity => {
            if (
              (activity.action === 'task_updated' && activity.details?.taskId === taskId) ||
              (activity.action === 'comment_added' && activity.details?.taskId === taskId) ||
              (activity.action === 'comment_updated' && activity.details?.taskId === taskId) ||
              (activity.action === 'comment_deleted' && activity.details?.taskId === taskId)
            ) {
              if (this.task && this.task._id) {
                this.loadComments(this.boardId, this.task._id);
              }
            }
          });
        }
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && changes['task'].currentValue) {
        const currentTask: Task = changes['task'].currentValue;
        this.taskForm.patchValue({
          title: currentTask.title,
          description: currentTask.description,
          status: currentTask.status,
          priority: currentTask.priority,
          assignedTo: (currentTask.assignedTo && typeof currentTask.assignedTo === 'object') ? currentTask.assignedTo._id : currentTask.assignedTo || null,
          tags: currentTask.tags,
          deadline: currentTask.deadline ? new Date(currentTask.deadline).toISOString().split('T')[0] : null
        });
        if (currentTask._id) {
          this.loadAttachments(this.boardId, currentTask._id);
          this.loadComments(this.boardId, currentTask._id);
        }
        if (currentTask.geminiSuggestions) {
          this.geminiSuggestions = currentTask.geminiSuggestions;
        }
      }
    if (changes['boardId'] && changes['boardId'].currentValue) {
      this.boardService.getBoardMembers(this.boardId).subscribe((members: BoardMember[]) => {
        this.boardMembers = members;
      });
      this.boardService.getBoardColumns(this.boardId).subscribe((columns: Column[]) => {
        this.boardColumns = columns;
        if (!this.taskForm.get('status')?.value && columns.length > 0) {
          this.taskForm.get('status')?.setValue(columns[0].title);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadAttachments(boardId: string, taskId: string): void {
    this.taskService.getAttachments(boardId, taskId).subscribe({
      next: (attachments) => {
        this.attachments = attachments;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toastr.error('Failed to load attachments');
        console.error('Load attachments error:', err);
      }
    });
  }

  private loadComments(boardId: string, taskId: string): void {
    this.taskService.getComments(boardId, taskId).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toastr.error('Failed to load comments');
        console.error('Load comments error:', err);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0 && this.task?._id) {
      const file = input.files[0];
      this.uploadAttachment(file, this.boardId, this.task._id);
    }
  }

  uploadAttachment(file: File, boardId: string, taskId: string): void {
    const formData = new FormData();
    formData.append('file', file);
    this.taskService.uploadAttachment(boardId, taskId, formData).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadProgress = Math.round(100 * event.loaded / event.total);
        } else if (event.type === HttpEventType.Response) {
          this.toastr.success('Attachment uploaded successfully!');
          this.loadAttachments(boardId, taskId);
          this.uploadProgress = 0;
        }
      },
      error: (err: any) => {
        const errorMessage = err.error?.message || 'Failed to upload attachment.';
        this.dialog.open(AttachmentErrorDialogComponent, {
          data: { errorMessage: errorMessage },
          width: '400px',
          panelClass: 'attachment-error-dialog-panel'
        });
        console.error('Upload attachment error:', err);
        this.uploadProgress = 0;
      }
    });
  }

  deleteAttachment(attachmentId: string): void {
    if (this.task?._id) {
      this.taskService.deleteAttachment(this.boardId, this.task._id, attachmentId).subscribe({
        next: () => {
          this.toastr.success('Attachment deleted successfully!');
          this.loadAttachments(this.boardId, this.task!._id);
        },
        error: (err: any) => {
          this.toastr.error('Failed to delete attachment.');
          console.error('Delete attachment error:', err);
        }
      });
    }
  }

  addComment(): void {
    if (this.commentForm.valid && this.task?._id) {
      const commentContent = this.commentForm.get('content')?.value;
      this.taskService.addComment(this.boardId, this.task._id, commentContent).subscribe({
        next: (comment) => {
          this.comments.push(comment);
          this.commentForm.reset();
          this.toastr.success('Comment added!');
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.toastr.error('Failed to add comment.');
          console.error('Add comment error:', err);
        }
      });
    }
  }

  deleteComment(commentId: string): void {
    if (this.task?._id) {
      this.taskService.deleteComment(this.boardId, this.task._id, commentId).subscribe({
        next: () => {
          this.comments = this.comments.filter(comment => comment._id !== commentId);
          this.toastr.success('Comment deleted!');
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.toastr.error('Failed to delete comment.');
          console.error('Delete comment error:', err);
        }
      });
    }
  }

  getGeminiSuggestions(): void {
    if (!this.taskForm.get('description')?.value) {
      this.toastr.info('Please add a description to get suggestions.');
      return;
    }

    this.isLoadingSuggestions = true;
    this.geminiSuggestions = null;
    this.taskService.getGeminiSuggestions(this.taskForm.get('title')?.value, this.taskForm.get('description')?.value).subscribe({
      next: (suggestion) => {
        this.geminiSuggestions = suggestion;
        this.isLoadingSuggestions = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toastr.error('Failed to get Gemini suggestions.');
        console.error('Gemini suggestions error:', err);
        this.isLoadingSuggestions = false;
      }
    });
  }

  applySuggestion(): void {
    if (this.geminiSuggestions) {
      const currentDescription = this.taskForm.get('description')?.value || '';
      const newDescription = currentDescription + '\n' + this.geminiSuggestions.text;
      this.taskForm.get('description')?.setValue(newDescription);
      this.geminiSuggestions = null;
      this.toastr.success('Suggestion applied!');
    }
  }

  addTag(newTagInput: HTMLInputElement): void {
    const newTag = newTagInput.value.trim();
    if (newTag) {
      const tagsControl = this.taskForm.get('tags');
      if (tagsControl) {
        const currentTags = tagsControl.value as string[];
        if (!currentTags.includes(newTag)) {
          tagsControl.setValue([...currentTags, newTag]);
          newTagInput.value = '';
        } else {
          this.toastr.info('Tag already exists.');
        }
      }
    }
  }

  removeTag(tagToRemove: string): void {
    const tagsControl = this.taskForm.get('tags');
    if (tagsControl) {
      const currentTags = tagsControl.value as string[];
      tagsControl.setValue(currentTags.filter(tag => tag !== tagToRemove));
    }
  }

  onClose(): void {
    this.close.emit(false);
  }

  onDelete(): void {
    if (confirm('Are you sure you want to delete this task?')) {
      if (this.task?._id && this.column?._id) {
        this.boardService.deleteTask(this.boardId, this.column._id, this.task._id).subscribe({
          next: () => {
            this.toastr.success('Task deleted successfully!');
            this.close.emit(true); // Close modal and indicate a change occurred
          },
          error: (err: any) => {
            this.toastr.error('Failed to delete task.');
            console.error('Delete task error:', err);
          }
        });
      }
    }
  }

  onSubmit(): void {
    if (this.taskForm.valid) {
      this.isSaving = true;
      const formValue = this.taskForm.value;
      const taskToSave: Partial<Task> = {
        title: formValue.title,
        description: formValue.description,
        status: formValue.status,
        priority: formValue.priority,
        assignedTo: formValue.assignedTo,
        tags: formValue.tags,
        deadline: formValue.deadline
      };

      if (this.isCreatingTask) {
        taskToSave.board = this.boardId;
        const columnId = this.boardColumns.find(column => column.title === formValue.status)?._id;
        if (columnId) {
          this.taskService.createTask(this.boardId, columnId, taskToSave).subscribe({
          next: () => {
            this.toastr.success('Task created successfully!');
            this.isSaving = false;
            this.save.emit(taskToSave);
            this.close.emit(true);
          },
          error: (err: any) => {
            this.toastr.error('Failed to create task.');
            console.error('Create task error:', err);
            this.isSaving = false;
          }
        });
        } else {
          this.toastr.error('Failed to create task: Column not found.');
          this.isSaving = false;
        }
      } else if (this.task?._id) {
        this.taskService.updateTask(this.boardId, this.task._id, taskToSave).subscribe({
          next: () => {
            this.toastr.success('Task updated successfully!');
            this.isSaving = false;
            this.save.emit(taskToSave);
            this.close.emit(true);
          },
          error: (err: any) => {
            this.toastr.error('Failed to update task.');
            console.error('Update task error:', err);
            this.isSaving = false;
          }
        });
      }
    } else {
      this.taskForm.markAllAsTouched();
      this.toastr.warning('Please fill in all required fields.');
    }
  }
}
