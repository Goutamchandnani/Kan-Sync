import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Board } from '../../features/board/models/board.model';

export interface BoardState {
  boards: Board[];
  currentBoard: Board | null;
  loading: boolean;
  error: any;
}

export const selectBoardState = createFeatureSelector<BoardState>('board');

export const selectAllBoards = createSelector(
  selectBoardState,
  (state: BoardState) => state.boards
);

export const selectCurrentBoard = createSelector(
  selectBoardState,
  (state: BoardState) => state.currentBoard
);

export const selectBoardLoading = createSelector(
  selectBoardState,
  (state: BoardState) => state.loading
);

export const selectBoardError = createSelector(
  selectBoardState,
  (state: BoardState) => state.error
);