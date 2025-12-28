import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, exhaustMap, catchError } from 'rxjs/operators';
import { BoardService } from '../../features/board/services/board.service';
import * as BoardActions from '../actions/board.actions';

@Injectable()
export class BoardEffects {

  // Load all boards
  loadBoards$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.loadBoards),
      exhaustMap(() =>
        this.boardService.getBoards().pipe(
          map(boards => BoardActions.loadBoardsSuccess({ boards })),
          catchError(error => of(BoardActions.loadBoardsFailure({ error })))
        )
      )
    )
  );

  // Load a single board by ID
  loadBoard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.loadBoard),
      exhaustMap(action =>
        this.boardService.getBoard(action.boardId).pipe(
          map(board => BoardActions.loadBoardSuccess({ board })),
          catchError(error => of(BoardActions.loadBoardFailure({ error })))
        )
      )
    )
  );

  // Create a new board
  createBoard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.createBoard),
      exhaustMap(action =>
        this.boardService.createBoard(action).pipe(
          map(board => BoardActions.createBoardSuccess({ board })),
          catchError(error => of(BoardActions.createBoardFailure({ error })))
        )
      )
    )
  );

  // Update an existing board
  updateBoard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.updateBoard),
      exhaustMap(action =>
        this.boardService.updateBoard(action.board._id, action.board).pipe(
          map(board => BoardActions.updateBoardSuccess({ board })),
          catchError(error => of(BoardActions.updateBoardFailure({ error })))
        )
      )
    )
  );

  // Move a task within a board
  moveTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.moveTask),
      exhaustMap(action =>
        this.boardService.moveTask(
          action.boardId,
          action.taskId,
          action.sourceColumnId,
          action.destinationColumnId,
          action.sourceIndex,
          action.destinationIndex
        ).pipe(
          map(board => BoardActions.moveTaskSuccess({ board })),
          catchError(error => of(BoardActions.moveTaskFailure({ error })))
        )
      )
    )
  );

  // Delete a task
  deleteTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.deleteTask),
      exhaustMap(action =>
        this.boardService.deleteTask(action.boardId, action.taskId, action.columnId).pipe(
          map(() => BoardActions.deleteTaskSuccess({ boardId: action.boardId, taskId: action.taskId, columnId: action.columnId })),
          catchError(error => of(BoardActions.deleteTaskFailure({ error })))
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private boardService: BoardService
  ) {}
}
