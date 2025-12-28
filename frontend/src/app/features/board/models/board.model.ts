import { User } from '../../auth/services/auth.service';

export interface Board {
  activeUsers: ActiveUser[];
  _id: string;
  title: string;
  description?: string;
  ownerId?: BoardMember;
  columns: Column[];
  members: BoardMember[];
  activities: Activity[];
  isPublic?: boolean;
  publicId?: string;
  isPubliclyShareable?: boolean;
  publicShareLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Column {
  _id: string;
  title: string;
  tasks: Task[];
  order: number;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  taskNumber?: number;
  deadline?: Date;
  assignedTo?: string | BoardMember;
  comments: Comment[];
  attachments: Attachment[];
  history: Activity[];
  createdAt: Date;
  updatedAt: Date;
  suggestedPriority?: 'low' | 'medium' | 'high';
  suggestedDeadline?: Date;
  suggestionReason?: string;
  tags?: string[];
  board?: string;
  geminiSuggestions?: GeminiSuggestion;
}

export interface BoardMember {
  _id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatar?: string;
}

export interface Comment {
  _id: string;
  taskId: string;
  content: string;
  user: BoardMember;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  _id: string;
  taskId: string;
  fileName: string;
  url: string;
  size: number;
  type: string;
  uploadedBy: BoardMember;
  createdAt: Date;
}

export interface Activity {
  _id: string;
  type: 'create' | 'update' | 'delete' | 'move' | 'comment' | 'assign';
  taskTitle: string;
  newColumn?: string;
  oldColumn?: string; // Added for move activity
  assignee?: BoardMember; // Added for assign activity
  user: BoardMember;
  timestamp: Date;
}

export interface ActiveUser extends User {
  status: 'online' | 'offline';
}

export interface GeminiSuggestion {
  priority: 'Low' | 'Medium' | 'High';
  deadline: string;
  reason: string;
  text: string;
}