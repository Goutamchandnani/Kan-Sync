export interface UserPresence {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'offline';
  lastSeen?: string;
  currentBoardId?: string;
}

export interface BoardPresence {
  boardId: string;
  users: UserPresence[];
  lastUpdated: string;
}