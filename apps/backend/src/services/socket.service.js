import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Activity from '../models/Activity.js';
import ActivityService from './activity.service.js';
import Board from '../models/Board.js';
import User from '../models/User.js';
import PresenceService from './presence.service.js';

class SocketService {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(url => url.trim()) : [],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      }
    });

    // Initialize presence service
    this.presenceService = new PresenceService(this.io);
    this.activityService = new ActivityService(this.io);
    
    // Start heartbeat cleanup interval
    setInterval(() => {
      const inactiveSockets = this.presenceService.cleanupInactiveSockets();
      inactiveSockets.forEach(socketId => {
      });
    }, this.presenceService.HEARTBEAT_INTERVAL);
    
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authenticate socket connections
    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
          return next(new Error('User not found'));
        }
        socket.user = user;
        next();
      } catch (err) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Add user presence on connection
      console.log('Socket connected. User:', socket.user);
      const presence = this.presenceService.addSocket(socket.id, socket.user.toObject());
      if (presence) {
        console.log(`User ${presence.name} connected with socket ${socket.id}`);
      }

      // Handle heartbeat
      socket.on('heartbeat', () => {
        const presence = this.presenceService.updateHeartbeat(socket.id);
        if (presence) {
          // PresenceService now emits updates directly
        }
      });

      // Handle board join
      socket.on('join-board', async ({ boardId }) => {
        console.log('Received join-board event. Board ID:', boardId, 'Authenticated User:', socket.user._id);
        if (!socket.user || !boardId) {
          console.error('join-board event: Missing authenticated user or boardId', { user: socket.user, boardId });
          return;
        }
        const joinCallId = Math.random().toString(36).substring(7);
        console.log(`[SocketService][${joinCallId}] join-board event received for user: ${socket.user._id}, boardId: ${boardId}`);
        try {
          // Join the board room
          socket.join(`board:${boardId}`);
          console.log(`Socket ${socket.id} joined room board:${boardId}`);
          
          // Add user to board's presence tracking (PresenceService emits update)
          console.log(`[SocketService] Calling presenceService.addUserToBoard for user ${socket.user._id} on board ${boardId}`);
          this.presenceService.addUserToBoard(boardId, socket.user.toObject());
          console.log(`[SocketService] presenceService.addUserToBoard called for user ${socket.user._id} on board ${boardId}`);

          // Emit presence update to board room
          const usersInBoard = this.presenceService.getBoardUsers(boardId);
          console.log(`[SocketService] Emitting presence-update for board ${boardId} with users:`, usersInBoard);
          this.io.to(`board:${boardId}`).emit("presence-update", {
            boardId,
            users: usersInBoard
          });
          
          // Log join activity
          await this.activityService.logActivity(boardId, socket.user._id, 'user_joined_board');
          
          console.log(`User ${socket.user.name} joined board: ${boardId}`);
        } catch (error) {
          console.error('Error in join-board:', error);
        }
      });

      // Handle board leave
      socket.on('leave-board', async ({ boardId, userId }) => {
        try {
          socket.leave(`board:${boardId}`);
          
          // Remove user from board's presence tracking (PresenceService emits update)
          this.presenceService.removeUserFromBoard(boardId, userId);
          
          // Log leave activity
          await this.activityService.logActivity(boardId, userId, 'user_left_board');
          
          console.log(`User left board: ${boardId}`);
        } catch (error) {
          console.error('Error in leave-board:', error);
        }
      });

      // Handle task events with enhanced activity tracking
      socket.on('task-created', async ({ boardId, task, columnId }) => {
        try {
          const board = await Board.findById(boardId).populate({
            path: 'columns',
            populate: {
              path: 'tasks',
              model: 'Task'
            }
          });
          if (!board) {
            console.error('Board not found for task-created event:', boardId);
            return;
          }

          const column = board.columns.find(col => col._id.toString() === columnId);

          const activity = await this.activityService.logActivity(boardId, socket.user.id, 'task_created', {
            taskId: task._id,
            columnId,
            columnTitle: column?.title || 'Unknown Column',
            title: task.title
          });
          
          // Then emit both task creation and activity update
          this.io.to(`board:${boardId}`).emit('task:created', {
            task,
            columnId,
            boardId,
            activity
          });
          this.presenceService.emitPresenceUpdate(boardId);
        } catch (error) {
          console.error('Error in task-created:', error);
        }
      });

      socket.on('task-updated', async ({ boardId, task }) => {
        try {
          const activity = await this.activityService.logActivity(boardId, socket.user.id, 'task_updated', {
            taskId: task._id,
            title: task.title,
            changes: task.changes // Track what changed
          });
          
          this.io.to(`board:${boardId}`).emit('task:updated', {
            task,
            boardId,
            activity
          });
        } catch (error) {
          console.error('Error in task-updated:', error);
        }
      });

      socket.on('task-moved', async ({ boardId, taskId, sourceColumnId, destinationColumnId, sourceIndex, destinationIndex }) => {
        try {
          const board = await Board.findById(boardId).populate({
            path: 'columns',
            populate: {
              path: 'tasks',
              model: 'Task'
            }
          });
          if (!board) {
            console.error('Board not found for task-moved event:', boardId);
            return;
          }

          const task = board.columns.reduce((acc, column) => {
            const foundTask = column.tasks.find(t => t._id.toString() === taskId);
            if (foundTask) acc = foundTask;
            return acc;
          }, null);

          const sourceColumn = board.columns.find(col => col._id.toString() === sourceColumnId);
          const destinationColumn = board.columns.find(col => col._id.toString() === destinationColumnId);

          const activity = await this.activityService.logActivity(boardId, socket.user.id, 'task_moved', {
            taskId,
            title: task?.title || 'Unknown Task',
            sourceColumnId,
            sourceColumnTitle: sourceColumn?.title || 'Unknown Column',
            destinationColumnId,
            destinationColumnTitle: destinationColumn?.title || 'Unknown Column',
            sourceIndex,
            destinationIndex
          });
          
          this.io.to(`board:${boardId}`).emit('task:moved', {
            taskId,
            sourceColumnId,
            destinationColumnId,
            sourceIndex,
            destinationIndex,
            boardId,
            activity
          });
        } catch (error) {
          console.error('Error in task-moved:', error);
        }
      });

      socket.on('task-deleted', async ({ boardId, taskId, columnId }) => {
        try {
          const board = await Board.findById(boardId);
          if (!board) {
            console.error('Board not found for task-deleted event:', boardId);
            return;
          }

          const column = board.columns.find(col => col._id.toString() === columnId);
          const task = column?.tasks.find(t => t._id.toString() === taskId);

          const activity = await this.activityService.logActivity(boardId, socket.user.id, 'task_deleted', {
            taskId,
            title: task?.title || 'Unknown Task',
            columnId,
            columnTitle: column?.title || 'Unknown Column'
          });
          
          this.io.to(`board:${boardId}`).emit('task:deleted', {
            taskId,
            columnId,
            boardId,
            activity
          });
          this.presenceService.emitPresenceUpdate(boardId);
        } catch (error) {
          console.error('Error in task-deleted:', error);
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        try {
          const userData = this.presenceService.removeSocket(socket.id);
          if (userData) {
            // PresenceService now emits updates directly
   
          }
        } catch (error) {
          console.error('Error in disconnect:', error);
        }
      });
    });
  }

}

export default SocketService;