import { createReducer, on } from '@ngrx/store';
import { BoardState } from '../selectors/board.selectors';
import * as BoardActions from '../actions/board.actions';

export const initialState: BoardState = {
  boards: [],
  currentBoard: null,
  loading: false,
  error: null
};

export const boardReducer = createReducer(
  initialState,
  
  // Load Boards
  on(BoardActions.loadBoards, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(BoardActions.loadBoardsSuccess, (state, { boards }) => ({
    ...state,
    boards,
    loading: false,
    error: null
  })),
  
  on(BoardActions.loadBoardsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  // Load Board
  on(BoardActions.loadBoard, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(BoardActions.loadBoardSuccess, (state, { board }) => ({
    ...state,
    currentBoard: board,
    loading: false,
    error: null
  })),
  
  on(BoardActions.loadBoardFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  // Create Board
  on(BoardActions.createBoard, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(BoardActions.createBoardSuccess, (state, { board }) => ({
    ...state,
    boards: [...state.boards, board],
    loading: false,
    error: null
  })),
  
  on(BoardActions.createBoardFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  // Update Board
  on(BoardActions.updateBoard, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(BoardActions.updateBoardSuccess, (state, { board }) => ({
    ...state,
    currentBoard: board,
    boards: state.boards.map(b => b._id === board._id ? board : b),
    loading: false,
    error: null
  })),
  
  on(BoardActions.updateBoardFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  // Move Task
  on(BoardActions.moveTask, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(BoardActions.moveTaskSuccess, (state, { board }) => ({
    ...state,
    currentBoard: board,
    loading: false,
    error: null
  })),
  
  on(BoardActions.moveTaskFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Delete Task
  on(BoardActions.deleteTask, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(BoardActions.deleteTaskSuccess, (state, { boardId, taskId, columnId }) => {
    if (!state.currentBoard || state.currentBoard._id !== boardId) {
      return state;
    }

    const updatedColumns = state.currentBoard.columns.map(column => {
      if (column._id === columnId) {
        return {
          ...column,
          tasks: column.tasks.filter(task => task._id !== taskId)
        };
      }
      return column;
    });

    return {
      ...state,
      currentBoard: {
        ...state.currentBoard,
        columns: updatedColumns
      },
      loading: false,
      error: null
    };
  }),

  on(BoardActions.deleteTaskFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);