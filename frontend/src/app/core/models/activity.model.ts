export type ActivityType = 
  | 'board_created'
  | 'board_updated'
  | 'column_created'
  | 'column_updated'
  | 'column_deleted'
  | 'user_joined_board'
  | 'user_left_board'
  | 'task_created'
  | 'task_updated'
  | 'task_moved'
  | 'task_deleted'
  | 'comment_added'
  | 'comment_updated'
  | 'comment_deleted';

export interface ActivityMetadata {
  taskId?: string;
  columnId?: string;
  title?: string;
  columnTitle?: string;
  sourceColumnId?: string;
  destinationColumnId?: string;
  sourceColumnTitle?: string;
  destinationColumnTitle?: string;
  sourceIndex?: number;
  destinationIndex?: number;
  changes?: Record<string, any>;
}

export interface Activity {
  task: string;
  type: string;
  details?: ActivityMetadata; // Made optional
  _id: string;
  boardId: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  action: ActivityType;
  metadata?: ActivityMetadata; // Made optional
  createdAt: string;
}