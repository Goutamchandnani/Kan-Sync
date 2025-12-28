import { createAction, props } from '@ngrx/store';
import { Board } from '../../features/board/models/board.model';

// Load Board Actions
export const loadBoard = createAction(
  '[Board] Load Board',
  props<{ boardId: string }>()
);

export const loadBoardSuccess = createAction(
  '[Board] Load Board Success',
  props<{ board: Board }>()
);

export const loadBoardFailure = createAction(
  '[Board] Load Board Failure',
  props<{ error: any }>()
);

// Load Boards Actions
export const loadBoards = createAction(
  '[Board] Load Boards'
);

export const loadBoardsSuccess = createAction(
  '[Board] Load Boards Success',
  props<{ boards: Board[] }>()
);

export const loadBoardsFailure = createAction(
  '[Board] Load Boards Failure',
  props<{ error: any }>()
);

// Create Board Actions
export const createBoard = createAction(
  '[Board] Create Board',
  props<{ title: string; isPublic?: boolean }>()
);

export const createBoardSuccess = createAction(
  '[Board] Create Board Success',
  props<{ board: Board }>()
);

export const createBoardFailure = createAction(
  '[Board] Create Board Failure',
  props<{ error: any }>()
);

// Update Board Actions
export const updateBoard = createAction(
  '[Board] Update Board',
  props<{ board: Board }>()
);

export const updateBoardSuccess = createAction(
  '[Board] Update Board Success',
  props<{ board: Board }>()
);

export const updateBoardFailure = createAction(
  '[Board] Update Board Failure',
  props<{ error: any }>()
);

// Move Task Actions
export const moveTask = createAction(
  '[Board] Move Task',
  props<{ 
    boardId: string;
    taskId: string;
    sourceColumnId: string;
    destinationColumnId: string;
    sourceIndex: number;
    destinationIndex: number;
  }>()
);

export const moveTaskSuccess = createAction(
  '[Board] Move Task Success',
  props<{ board: Board }>()
);

export const moveTaskFailure = createAction(
  '[Board] Move Task Failure',
  props<{ error: any }>()
);

// Delete Task Actions
export const deleteTask = createAction(
  '[Board] Delete Task',
  props<{ boardId: string; taskId: string; columnId: string }>()
);

export const deleteTaskSuccess = createAction(
  '[Board] Delete Task Success',
  props<{ boardId: string; taskId: string; columnId: string }>()
);

export const deleteTaskFailure = createAction(
  '[Board] Delete Task Failure',
  props<{ error: any }>()
);