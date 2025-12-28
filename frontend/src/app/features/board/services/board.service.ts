import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Board, BoardMember, Column, Task } from '../models/board.model';

@Injectable({
  providedIn: 'root'
})
export class BoardService {
  getBoardMembers(boardId: string): Observable<BoardMember[]> {
    return this.getBoard(boardId).pipe(
      map((board: Board) => board.members || []),
      catchError(error => {
        console.error(`Error fetching board members for board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to fetch board members, please try again later.`));
      })
    );
  }

  getBoardColumns(boardId: string): Observable<Column[]> {
    return this.getBoard(boardId).pipe(
      map((board: Board) => board.columns || []),
      catchError(error => {
        console.error(`Error fetching board columns for board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to fetch board columns, please try again later.`));
      })
    );
  }
  addColumn(boardId: string, title: string): Observable<Board> {
    return this.createColumn(boardId, { title });
  }
  private readonly API_URL = `${environment.apiUrl}/boards`;

  constructor(private http: HttpClient) {}

  getBoards(): Observable<Board[]> {
    return this.http.get<Board[]>(this.API_URL).pipe(
      catchError(error => {
        console.error('Error fetching boards:', error);
        return throwError(() => new Error('Failed to fetch boards, please try again later.'));
      })
    );
  }

  getBoard(id: string): Observable<Board> {
    console.log(`Fetching board with ID: ${id}`);
    return this.http.get<Board>(`${this.API_URL}/${id}`).pipe(
      catchError(error => {
        console.error(`Error fetching board with ID ${id}:`, error);
        return throwError(() => new Error(`Failed to fetch board with ID ${id}, please try again later.`));
      })
    );
  }



  createBoard(board: Partial<Board>): Observable<Board> {
    return this.http.post<Board>(this.API_URL, board).pipe(
      catchError(error => {
        console.error('Error creating board:', error);
        return throwError(() => new Error('Failed to create board, please try again later.'));
      })
    );
  }

  updateBoard(id: string, board: Partial<Board>): Observable<Board> {
    return this.http.put<Board>(`${this.API_URL}/${id}`, board).pipe(
      catchError(error => {
        console.error(`Error updating board with ID ${id}:`, error);
        return throwError(() => new Error(`Failed to update board with ID ${id}, please try again later.`));
      })
    );
  }

  deleteBoard(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`).pipe(
      catchError(error => {
        console.error(`Error deleting board with ID ${id}:`, error);
        return throwError(() => new Error(`Failed to delete board with ID ${id}, please try again later.`));
      })
    );
  }

  createTask(boardId: string, columnId: string, task: Partial<Task>): Observable<Board> {
    return this.http.post<Board>(`${this.API_URL}/${boardId}/tasks`, {
      columnId,
      ...task
    }).pipe(
      catchError(error => {
        console.error(`Error creating task in board ${boardId}, column ${columnId}:`, error);
        return throwError(() => new Error(`Failed to create task, please try again later.`));
      })
    );
  }

  updateTask(boardId: string, taskId: string, task: Partial<Task>): Observable<Board> {
    return this.http.put<Board>(`${this.API_URL}/${boardId}/tasks/${taskId}`, task).pipe(
      catchError(error => {
        console.error(`Error updating task ${taskId} in board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to update task, please try again later.`));
      })
    );
  }

  moveTask(
    boardId: string,
    taskId: string,
    sourceColumnId: string,
    destinationColumnId: string,
    sourceIndex: number,
    destinationIndex: number
  ): Observable<Board> {
    return this.http.put<Board>(`${this.API_URL}/${boardId}/tasks/${taskId}/move`, {
      sourceColumnId,
      destinationColumnId,
      sourceIndex,
      destinationIndex,
    }).pipe(
      catchError(error => {
        console.error(`Error moving task ${taskId} in board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to move task, please try again later.`));
      })
    );
  }

  deleteColumn(boardId: string, columnId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${boardId}/columns/${columnId}`).pipe(
      catchError(error => {
        console.error(`Error deleting column ${columnId} from board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to delete column, please try again later.`));
      })
    );
  }

  deleteTask(boardId: string, columnId: string, taskId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${boardId}/columns/${columnId}/tasks/${taskId}`).pipe(
      catchError(error => {
        console.error(`Error deleting task ${taskId} from board ${boardId}, column ${columnId}:`, error);
        return throwError(() => new Error(`Failed to delete task, please try again later.`));
      })
    );
  }


  createColumn(boardId: string, column: Partial<Column>): Observable<Board> {
    console.log(`Creating column for board ${boardId}:`, column);
    return this.http.post<Board>(`${this.API_URL}/${boardId}/columns`, column).pipe(
      catchError(error => {
        console.error(`Error creating column for board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to create column, please try again later.`));
      })
    );
  }



  addMember(boardId: string, email: string): Observable<Board> {
    return this.http.post<Board>(`${this.API_URL}/${boardId}/members`, { email }).pipe(
      catchError(error => {
        console.error(`Error adding member to board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to add member, please try again later.`));
      })
    );
  }

  removeMember(boardId: string, memberId: string): Observable<Board> {
    return this.http.delete<Board>(`${this.API_URL}/${boardId}/members/${memberId}`).pipe(
      catchError(error => {
        console.error(`Error removing member ${memberId} from board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to remove member, please try again later.`));
      })
    );
  }

  getBoardActivities(boardId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/${boardId}/activities`).pipe(
      catchError(error => {
        console.error(`Error fetching activities for board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to fetch board activities, please try again later.`));
      })
    );
  }

  togglePublicSharing(boardId: string, enable: boolean): Observable<Board> {
    return this.http.put<Board>(`${this.API_URL}/${boardId}/share`, { enable }).pipe(
      catchError(error => {
        console.error(`Error toggling public sharing for board ${boardId}:`, error);
        return throwError(() => new Error(`Failed to toggle public sharing, please try again later.`));
      })
    );
  }

  getPublicBoard(publicId: string): Observable<Board> {
    return this.http.get<Board>(`${environment.apiUrl}/public/boards/share/${publicId}`).pipe(
      catchError(error => {
        console.error(`Error fetching public board with ID ${publicId}:`, error);
        return throwError(() => new Error(`Failed to fetch public board, please try again later.`));
      })
    );
  }
}

