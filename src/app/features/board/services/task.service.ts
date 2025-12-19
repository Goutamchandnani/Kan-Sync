import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { filter, map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Task, Attachment, Comment } from '../models/board.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly API_URL = `${environment.apiUrl}`;
  private uploadProgress$ = new BehaviorSubject<number>(0);
  deleteTask: any;

  constructor(private http: HttpClient){}

  getUploadProgress(): Observable<number> {
    return this.uploadProgress$.asObservable();
  }

  uploadAttachment(boardId: string, taskId: string, formData: FormData): Observable<Task> {
    return this.http.post(
      `${this.API_URL}/boards/${boardId}/tasks/${taskId}/attachments`,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }
    ).pipe(
      filter((event: any) => event.type === HttpEventType.Response),
      map((event: any) => {
        this.uploadProgress$.next(100);
        return event.body as Task;
      }),
      catchError(error => {
        console.error(`Error uploading attachment for task ${taskId} in board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to upload attachment, please try again later.`));
      })
    );
  }

  updateTask(boardId: string, taskId: string, task: Partial<Task>): Observable<Task> {
    return this.http.put<Task>(`${this.API_URL}/boards/${boardId}/tasks/${taskId}`, task).pipe(
      catchError(error => {
        console.error(`Error updating task ${taskId} in board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to update task, please try again later.`));
      })
    );
  }

  createTask(boardId: string, columnId: string, task: Partial<Task>): Observable<Task> {
    return this.http.post<Task>(`${this.API_URL}/boards/${boardId}/columns/${columnId}/tasks`, task).pipe(
      catchError(error => {
        console.error(`Error creating task in board ${boardId}, column ${columnId}:`, error);
        return throwError(() => new Error(`Failed to create task, please try again later.`));
      })
    );
  }

  getComments(boardId: string, taskId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.API_URL}/boards/${boardId}/tasks/${taskId}/comments`).pipe(
      map(comments => comments.map(comment => ({
        ...comment,
        createdAt: new Date(comment.createdAt)
      }))),
      catchError(error => {
        console.error(`Error fetching comments for task ${taskId} in board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to fetch comments, please try again later.`));
      })
    );
  }

  addComment(boardId: string, taskId: string, content: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.API_URL}/boards/${boardId}/tasks/${taskId}/comments`, { content }).pipe(
      map(comment => ({
        ...comment,
        createdAt: new Date(comment.createdAt)
      })),
      catchError(error => {
        console.error(`Error adding comment to task ${taskId} in board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to add comment, please try again later.`));
      })
    );
  }

  getAttachments(boardId: string, taskId: string): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(`${this.API_URL}/boards/${boardId}/tasks/${taskId}/attachments`).pipe(
      catchError(error => {
        console.error(`Error fetching attachments for task ${taskId} in board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to fetch attachments, please try again later.`));
      })
    );
  }

  deleteAttachment(boardId: string, taskId: string, attachmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/boards/${boardId}/tasks/${taskId}/attachments/${attachmentId}`).pipe(
      catchError(error => {
        console.error(`Error deleting attachment ${attachmentId} from task ${taskId} in board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to delete attachment, please try again later.`));
      })
    );
  }

  deleteComment(boardId: string, taskId: string, commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/boards/${boardId}/tasks/${taskId}/comments/${commentId}`).pipe(
      catchError(error => {
        console.error(`Error deleting comment ${commentId} from task ${taskId} in board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to delete comment, please try again later.`));
      })
    );
  }

  getGeminiSuggestions(title: string, description: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/boards/gemini/suggest-task`, { title, description }).pipe(
      catchError(error => {
        console.error(`Error getting Gemini suggestions for task:`, error);
        return throwError(() => new Error(`Failed to get Gemini suggestions, please try again later.`));
      })
    );
  }
}