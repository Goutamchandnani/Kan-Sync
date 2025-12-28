import express from 'express';
import { body, validationResult } from 'express-validator';
import Board from '../models/Board.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import ActivityService from '../services/activity.service.js';

let activityService;
import Notification from '../models/Notification.js'; // Import Notification model
import Task from '../models/Task.js';
import { generateTaskSuggestions } from '../services/gemini.service.js';
 import { authenticateToken, isOwnerOrMember } from '../middleware/auth.js';
import Comment from '../models/Comment.js';
import Attachment from '../models/Attachment.js';
import multer from 'multer';
import cloudinary from '../../src/services/cloudinary.service.js';
import { Readable } from 'stream';

// Set up multer for in-memory file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

router.use((req, res, next) => {
  const io = req.app.get('io');
  if (!activityService && io) {
    activityService = new ActivityService(io);
  } else if (!io) {
    console.error('Socket.IO instance not found on req.app. Activity logging may not work.');
  }
  next();
});

function sanitizeBoardForPublic(board) {
  const sanitizedBoard = board.toObject();
  delete sanitizedBoard.ownerId;
  delete sanitizedBoard.members;
  delete sanitizedBoard.activityLog;
  // Sanitize tasks within columns
  sanitizedBoard.columns.forEach(column => {
    column.tasks = column.tasks.map(task => sanitizeTaskForPublic(task));
  });
  return sanitizedBoard;
}

function sanitizeTaskForPublic(task) {
  const sanitizedTask = task.toObject();
  delete sanitizedTask.assignedTo; // Assuming assignedTo is sensitive
  // Add any other sensitive task fields here
  return sanitizedTask;
}

// Get all boards for current user
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const boards = await Board.find({
      $or: [
        { ownerId: req.user.id },
        { members: req.user.id }
      ]
    }).populate('ownerId', 'name email avatar');
    res.json(boards);
  } catch (err) {
    next(err);
  }
});

// Delete a comment
router.delete('/:boardId/tasks/:taskId/comments/:commentId', authenticateToken, isOwnerOrMember, async (req, res, next) => {
  try {
    const { boardId, taskId, commentId } = req.params;

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
      return res.status(404).json({ error: true, message: 'Comment not found.', code: 404 });
    }

    await activityService.logActivity(boardId, req.user.id, 'comment_deleted', {
      taskId,
      commentId,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('task:comment-deleted', {
        boardId,
        taskId,
        commentId,
      });
    }

    res.status(200).json({ message: 'Comment deleted successfully.' });
  } catch (err) {
    console.error('Error deleting comment:', err);
    next(err);
  }
});

// Update a comment
router.put('/:boardId/tasks/:taskId/comments/:commentId', authenticateToken, isOwnerOrMember, [
  body('text').trim().notEmpty().withMessage('Comment text is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg, code: 400 });
    }

    const { commentId } = req.params;
    const { text } = req.body;

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { text, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedComment) {
      return res.status(404).json({ error: true, message: 'Comment not found.', code: 404 });
    }

    await activityService.logActivity(updatedComment.boardId, req.user.id, 'comment_updated', {
      taskId: updatedComment.taskId,
      commentId: updatedComment._id,
      text,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${updatedComment.boardId}`).emit('task:comment-updated', {
        boardId: updatedComment.boardId,
        taskId: updatedComment.taskId,
        comment: updatedComment,
      });
    }

    res.json(updatedComment);
  } catch (err) {
    console.error('Error updating comment:', err);
    next(err);
  }
});

// Add a comment to a task
router.post('/:boardId/tasks/:taskId/comments', authenticateToken, isOwnerOrMember, [
  body('text').trim().notEmpty().withMessage('Comment text is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg, code: 400 });
    }

    const { boardId, taskId } = req.params;
    const { text } = req.body;

    const newComment = new Comment({
      boardId,
      taskId,
      userId: req.user.id,
      text,
    });
    await newComment.save();

    await activityService.logActivity(boardId, req.user.id, 'comment_added', {
      taskId,
      commentId: newComment._id,
      text,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('task:comment-added', {
        boardId,
        taskId,
        comment: newComment,
      });
    }

    res.status(201).json(newComment);
  } catch (err) {
    console.error('Error adding comment:', err);
    next(err);
  }
});

// Get comments for a task
router.get('/:boardId/tasks/:taskId/comments', authenticateToken, isOwnerOrMember, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const comments = await Comment.find({ taskId })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    next(err);
  }
});

// Create new board
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg, code: 400 });
    }

    const { title, isPublic } = req.body;
    const board = new Board({
      title,
      ownerId: req.user.id,
      isPublic: isPublic || false,
      columns: [
        { title: 'To Do' },
        { title: 'In Progress' },
        { title: 'Done' }
      ]
    });

    await board.save();

    await activityService.logActivity(board._id, req.user.id, 'board_created', { title });

    // Only emit socket event if io is available
    const io = req.app.get('io');
    if (io) {
      io.emit('board:created', board);
    }

    res.status(201).json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: 'Server error', code: 500 });
    next(err);
  }
});

// Get board by ID
router.get('/:boardId', isOwnerOrMember, async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.boardId)
      .populate('ownerId', 'name email avatar')
      .populate('members', 'name email avatar')
      .populate({
        path: 'columns.tasks',
        model: 'Task',
        populate: [
          {
            path: 'assignedTo',
            model: 'User',
            select: 'name email avatar'
          },
          {
            path: 'geminiSuggestions',
            model: 'GeminiSuggestion'
          }
        ]
      });
    res.json(board);
  } catch (err) {
    next(err);
  }
});

// Get AI-powered task suggestions
router.get('/:boardId/suggestions', isOwnerOrMember, async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: true, message: 'User ID is required', code: 400 });
    }

    const suggestions = await suggest({ userId, boardId: req.params.boardId });
    res.json(suggestions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: 'Server error', code: 500 });
    next(err);
  }
});

// Update board
router.put('/:boardId', isOwnerOrMember, [
  body('title').trim().notEmpty().withMessage('Title is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg, code: 400 });
    }

    const { title, isPublic } = req.body;
    const board = await Board.findByIdAndUpdate(
      req.params.boardId,
      { title, isPublic, updatedAt: Date.now() },
      { new: true }
    );

    await activityService.logActivity(board._id, req.user.id, 'board_updated', { title });

    // Only emit socket event if io is available
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.boardId).emit('board:updated', board);
    }

    res.json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: 'Server error', code: 500 });
    next(err);
  }
});

// Delete a column
router.delete('/:boardId/columns/:columnId', authenticateToken, isOwnerOrMember, async (req, res, next) => {
  try {
    const { boardId, columnId } = req.params;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ error: true, message: 'Board not found.', code: 404 });
    }

    const column = board.columns.id(columnId);
    if (!column) {
      return res.status(404).json({ error: true, message: 'Column not found.', code: 404 });
    }

    // Delete all tasks associated with this column
    await Task.deleteMany({ _id: { $in: column.tasks } });

    column.remove(); // Mongoose method to remove subdocument
    await board.save();

    await activityService.logActivity(boardId, req.user.id, 'column_deleted', { columnId, title: column.title });

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('column:deleted', { boardId, columnId });
    }

    res.status(200).json({ message: 'Column deleted successfully.' });
  } catch (err) {
    console.error('Error deleting column:', err);
    next(err);
  }
});



// Revoke public share link for a board


router.put('/:boardId/share', authenticateToken, isOwnerOrMember, async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) {
      return res.status(404).json({ error: true, message: 'Board not found.', code: 404 });
    }

    const { enable } = req.body;

    if (enable) {
      // Enable public sharing
      const publicId = crypto.randomBytes(16).toString('hex');
      board.isPubliclyShareable = true;
      board.publicId = publicId;
      board.publicShareLink = `${process.env.FRONTEND_URL}/public/board/${publicId}`;
      await activityService.logActivity(board._id, req.user.id, 'board_shared_publicly', { publicId });
    } else {
      // Disable public sharing
      board.isPubliclyShareable = false;
      board.publicId = undefined;
      board.publicShareLink = undefined;
      await activityService.logActivity(board._id, req.user.id, 'board_sharing_revoked');
    }

    await board.save();

    const io = req.app.get('io');
    if (io) {
      io.to(req.params.boardId).emit('board:updated', board);
    }

    res.json(board);
  } catch (err) {
    console.error('Error toggling public sharing:', err);
    res.status(500).json({ error: true, message: 'Server error', details: err.message, code: 500 });
    next(err);
  }
});
router.post('/:boardId/columns', authenticateToken, isOwnerOrMember, [
  body('title').trim().notEmpty().withMessage('Column title is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg, code: 400 });
    }

    const { title } = req.body;
    const board = await Board.findById(req.params.boardId);
    board.columns.push({ title });
    await board.save();

    await activityService.logActivity(board._id, req.user.id, 'column_created', { title });

    // Only emit socket event if io is available
    const io = req.app.get('io');
    if (io) {
      io.to(`board:${req.params.boardId}`).emit('column:created', {
        boardId: board._id,
        column: board.columns[board.columns.length - 1]
      });
      if (board.isPublic && board.publicId) {
        io.to(board.publicId).emit('public-board:column-created', {
          boardId: board._id,
          column: board.columns[board.columns.length - 1].toObject()
        });
      }
    }

    res.json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: 'Server error', code: 500 });
    next(err);
  }
});

// Add/update task
router.post('/:boardId/columns/:columnId/tasks', isOwnerOrMember, [
  body('title').trim().notEmpty().withMessage('Task title is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg, code: 400 });
    }

    const { title, description, deadline, assignedTo, priority } = req.body;
    console.log('Received assignedTo:', assignedTo);

    let suggestedPriority, suggestedDeadline, suggestionReason;

    if (title && description) {
      const suggestions = await generateTaskSuggestions(title, description);
      suggestedPriority = suggestions.priority;
      suggestedDeadline = suggestions.deadline;
      suggestionReason = suggestions.reason;
    }

    const board = await Board.findById(req.params.boardId);
    if (!board) {
      return res.status(404).json({ error: true, message: 'Board not found.', code: 404 });
    }

    board.taskCounter++; // Increment task counter
    await board.save(); // Save the updated board with the new counter

    const column = board.columns.id(req.params.columnId);
    if (!column) {
      return res.status(404).json({ error: true, message: 'Column not found.', code: 404 });
    }

    const newTask = new Task({
      title,
      description,
      deadline,
      assignedTo,
      priority,
      suggestedPriority,
      suggestedDeadline,
      suggestionReason,
      taskNumber: board.taskCounter, // Assign the new task number
      board: board._id, // Link task to board
      column: column._id // Link task to column
    });
    await newTask.save();

    column.tasks.push(newTask._id);
    await board.save();

    await activityService.logActivity(board._id, req.user.id, 'task_created', { columnId: column._id, taskId: newTask._id, title: newTask.title });

    // Create notification if task is assigned
    if (assignedTo) {
      const assignedUser = await User.findById(assignedTo);
      console.log('Found assignedUser:', assignedUser);
      if (assignedUser) {
        const notification = new Notification({
          userId: assignedTo,
          type: 'task_assigned',
          message: `You have been assigned to task "${newTask.title}" on board "${board.title}".`,
          relatedEntities: {
            boardId: board._id,
            taskId: newTask._id
          }
        });
        await notification.save();
        // Emit real-time notification (to be implemented later)
        const io = req.app.get('io');
        if (io) {
          io.to(assignedTo.toString()).emit('notification:new', notification);
        }
      }
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      console.log(`Backend: Socket.IO instance found. Attempting to emit 'task:created' to room ${req.params.boardId}`);
      io.to(`board:${req.params.boardId}`).emit('task:created', {
        boardId: board._id,
        columnId: column._id,
        task: newTask
      });
      console.log(`Backend: 'task:created' event emitted to room ${req.params.boardId}.`);
      if (board.isPublic && board.publicId) {
        io.to(board.publicId).emit('public-board:task-created', {
          boardId: board._id,
          columnId: column._id,
          task: sanitizeTaskForPublic(newTask)
        });
      }
    } else {
      console.error('Backend: Socket.IO instance not found on req.app.');
    }

    res.status(201).json(newTask);
  } catch (err) {
    console.error('Error creating task:', err);
    next(err);
  }
});

// Delete a task
router.delete('/:boardId/columns/:columnId/tasks/:taskId', authenticateToken, isOwnerOrMember, async (req, res, next) => {
  try {
    const { boardId, columnId, taskId } = req.params;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ error: true, message: 'Board not found.', code: 404 });
    }

    const column = board.columns.id(columnId);
    if (!column) {
      return res.status(404).json({ error: true, message: 'Column not found.', code: 404 });
    }

    const taskIndex = column.tasks.indexOf(taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ error: true, message: 'Task not found in column.', code: 404 });
    }

    column.tasks.splice(taskIndex, 1);
    await board.save();

    // Also delete the task document itself
    await Task.findByIdAndDelete(taskId);

    await activityService.logActivity(boardId, req.user.id, 'task_deleted', { columnId, taskId });

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('task:deleted', { boardId, columnId, taskId });
    }

    res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (err) {
    console.error('Error deleting task:', err);
    next(err);
  }
});

// Update task
router.put('/:boardId/tasks/:taskId', isOwnerOrMember, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    console.log('Update Task: Received taskId', taskId);
    const { title, description, deadline, assignedTo, priority, status, tags } = req.body;

    let suggestedPriority, suggestedDeadline, suggestionReason;

    if (title && description) {
      const suggestions = await generateTaskSuggestions(title, description);
      suggestedPriority = suggestions.priority;
      suggestedDeadline = suggestions.deadline;
      suggestionReason = suggestions.reason;
    }

    console.log('Update Task: Attempting to find and update taskId', taskId, 'with data', { title, description, deadline, assignedTo, priority, status });
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { title, description, deadline, assignedTo, priority, status, suggestedPriority, suggestedDeadline, suggestionReason, tags, updatedAt: Date.now() },
      { new: true }
    );
    const board = await Board.findById(req.params.boardId);
    if (!updatedTask) {
      console.log('Update Task: Task not found for taskId', taskId);
      return res.status(404).json({ error: true, message: 'Task not found.', code: 404 });
    }

    // Create notification if assignedTo changes
    if (assignedTo && updatedTask.assignedTo && !updatedTask.assignedTo.equals(assignedTo)) {
      const assignedUser = await User.findById(assignedTo);
      const board = await Board.findById(req.params.boardId);
      if (assignedUser && board) {
        const notification = new Notification({
          userId: assignedTo,
          type: 'task_assigned',
          message: `You have been assigned to task "${updatedTask.title}" on board "${board.title}".`,
          relatedEntities: {
            boardId: board._id,
            taskId: updatedTask._id
          }
        });
        await notification.save();
        const io = req.app.get('io');
        if (io) {
          io.to(assignedTo.toString()).emit('notification:new', notification);
        }
      }
    }

    await activityService.logActivity(updatedTask.board, req.user.id, 'task_updated', { taskId: updatedTask._id, title: updatedTask.title, changes: req.body });

    // Emit WebSocket event for task update
    const io = req.app.get('io');
    if (io) {
      io.to(`board:${req.params.boardId}`).emit('task:updated', {
        boardId: req.params.boardId,
        taskId: updatedTask._id,
        task: updatedTask
      });
      if (board.isPublic && board.publicId) {
        io.to(board.publicId).emit('public-board:task-updated', {
          boardId: req.params.boardId,
          taskId: updatedTask._id,
          task: sanitizeTaskForPublic(updatedTask)
        });
      }
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    next(error);
  }
});

// Upload attachment to a task


// Delete attachment from a task
router.delete('/:boardId/tasks/:taskId/attachments/:attachmentId', authenticateToken, isOwnerOrMember, async (req, res, next) => {
  try {
    const { boardId, taskId, attachmentId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: true, message: 'Task not found.', code: 404 });
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: true, message: 'Attachment not found.', code: 404 });
    }

    // Remove from Cloudinary
    const publicId = attachment.url.split('/').pop().split('.')[0]; // Extract public ID from URL
    await cloudinary.uploader.destroy(`task-attachments/${boardId}/${taskId}/${publicId}`);

    task.attachments.pull(attachmentId);
    await task.save();

    await activityService.logActivity(boardId, req.user.id, 'attachment_removed', {
      taskId: task._id,
      attachmentId: attachment._id,
      fileName: attachment.fileName,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('task:attachment-removed', {
        boardId,
        taskId: task._id,
        attachmentId,
      });
    }

    res.status(200).json({ message: 'Attachment deleted successfully.' });
  } catch (err) {
    console.error('Error deleting attachment:', err);
    next(err);
  }
});

// Delete task
router.delete('/:boardId/tasks/:taskId', isOwnerOrMember, async (req, res, next) => {
  try {
    const { boardId, taskId } = req.params;
    console.log('Delete Task: Received boardId', boardId, 'and taskId', taskId);
    const board = await Board.findById(req.params.boardId);
    if (!board) {
      return res.status(404).json({ error: true, message: 'Board not found.', code: 404 });
    }

    const taskToDelete = await Task.findById(req.params.taskId);
    if (!taskToDelete) {
      return res.status(404).json({ error: true, message: 'Task not found.', code: 404 });
    }

    // Remove task from its column in the board
    board.columns.forEach(column => {
      column.tasks = column.tasks.filter(task => !task.equals(req.params.taskId));
    });
    await board.save();

    console.log('Delete Task: Attempting to delete taskId', taskId);
    await Task.findByIdAndDelete(req.params.taskId);
    console.log('Delete Task: Successfully deleted taskId', taskId);

    await activityService.logActivity(req.params.boardId, req.user.id, 'task_deleted', { taskId: req.params.taskId, title: taskToDelete.title });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`board:${req.params.boardId}`).emit('task:deleted', {
        boardId: req.params.boardId,
        taskId: req.params.taskId,
        taskStatus: taskToDelete.status // Emit the status of the deleted task
      });
      if (board.isPublic && board.publicId) {
        io.to(board.publicId).emit('public-board:task-deleted', {
          boardId: board._id,
          taskId: req.params.taskId,
          taskStatus: taskToDelete.status
        });
      }
    }

    res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// Move task between columns
router.put('/:boardId/tasks/:taskId/move', isOwnerOrMember, async (req, res, next) => {
  try {
    console.log('Move Task Request - Params:', req.params);
    console.log('Move Task Request - Body:', req.body);
    const { sourceColumnId, destinationColumnId, sourceIndex, destinationIndex } = req.body;
    console.log('Move Task: Received:', { sourceColumnId, destinationColumnId, sourceIndex, destinationIndex });

    const board = await Board.findById(req.params.boardId);
    if (!board) {
      console.error('Move Task: Board not found for ID:', req.params.boardId);
      return res.status(404).json({ error: true, message: 'Board not found.', code: 404 });
    }
    console.log('Move Task: Board found:', board._id);

    const sourceColumn = board.columns.id(sourceColumnId);
    if (!sourceColumn) {
      console.error('Move Task: Source column not found for ID:', sourceColumnId);
      return res.status(404).json({ error: true, message: 'Source column not found.', code: 404 });
    }

    const destinationColumn = board.columns.id(destinationColumnId);
    if (!destinationColumn) {
      console.error('Move Task: Destination column not found for ID:', destinationColumnId);
      return res.status(404).json({ error: true, message: 'Destination column not found.', code: 404 });
    }
    console.log('Move Task: Source and Destination columns found.');

    // Validate sourceIndex
    if (sourceIndex < 0 || sourceIndex >= sourceColumn.tasks.length) {
      console.error('Move Task: Invalid sourceIndex:', sourceIndex, 'for column:', sourceColumnId, 'tasks length:', sourceColumn.tasks.length);
      return res.status(400).json({ error: true, message: 'Invalid source index.', code: 400 });
    }

    // Validate destinationIndex
    if (destinationIndex < 0 || destinationIndex > destinationColumn.tasks.length) {
      console.error('Move Task: Invalid destinationIndex:', destinationIndex, 'for column:', destinationColumnId, 'tasks length:', destinationColumn.tasks.length);
      return res.status(400).json({ error: true, message: 'Invalid destination index.', code: 400 });
    }

    console.log('Move Task: Before splice - taskId:', req.params.taskId, 'sourceColumn tasks length:', sourceColumn.tasks.length, 'destinationColumn tasks length:', destinationColumn.tasks.length);
    const actualSourceIndex = sourceColumn.tasks.findIndex(task => task._id.toString() === req.params.taskId);

    if (actualSourceIndex === -1) {
      console.error('Move Task: Task with ID', req.params.taskId, 'not found in source column', sourceColumnId);
      return res.status(404).json({ error: true, message: 'Task not found in source column.', code: 404 });
    }

    // Find the task as a Mongoose document
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      console.error('Move Task: Task not found in database for ID:', req.params.taskId);
      return res.status(404).json({ error: true, message: 'Task not found in database.', code: 404 });
    }

    // Remove task ID from source column
    sourceColumn.tasks.splice(actualSourceIndex, 1);
    console.log('Move Task: Task ID removed from source column. New sourceColumn tasks length:', sourceColumn.tasks.length);

    // Add task ID to destination column
    destinationColumn.tasks.splice(destinationIndex, 0, task._id);
    console.log('Move Task: Task ID added to destination column. New destinationColumn tasks length:', destinationColumn.tasks.length);

    try {
      await board.save();
      console.log('Move Task: Board saved successfully.');
    } catch (saveError) {
      console.error('Move Task: Error saving board:', saveError);
      return res.status(500).json({ error: true, message: 'Error saving board after task move.', code: 500 });
    }



    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.boardId).emit('task:moved', {
        boardId: board._id,
        taskId: task._id,
        sourceColumnId,
        destinationColumnId,
        sourceIndex,
        destinationIndex
      });
      if (board.isPublic && board.publicId) {
        io.to(board.publicId).emit('public-board:task-moved', {
          boardId: board._id,
          taskId: task._id,
          sourceColumnId,
          destinationColumnId,
          sourceIndex,
          destinationIndex,
          task: sanitizeTaskForPublic(task)
        });
      }
    }

    res.json(board);
  } catch (err) {
    console.error('Move Task: Unhandled error:', err);
    res.status(500).json({ error: true, message: 'Server error', code: 500 });
    next(err);
  }
});

// Get board activities
router.get('/:boardId/activities', isOwnerOrMember, async (req, res, next) => {
  try {
    const activities = await Activity.find({ boardId: req.params.boardId })
      .populate('userId', 'name email avatar')
      .sort('-timestamp')
      .limit(50);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: true, message: 'Server error', code: 500 });
    next(err);
  }
});

// Update column
router.put('/:boardId/columns/:columnId', isOwnerOrMember, [
  body('title').trim().notEmpty().withMessage('Column title is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg, code: 400 });
    }

    const { title } = req.body;
    const board = await Board.findById(req.params.boardId);
    if (!board) {
      return res.status(404).json({ error: true, message: 'Board not found.', code: 404 });
    }

    const column = board.columns.id(req.params.columnId);
    if (!column) {
      return res.status(404).json({ error: true, message: 'Column not found.', code: 404 });
    }

    column.title = title;
    await board.save();

    // Log activity
    const activity = new Activity({
      boardId: board._id,
      userId: req.user.id,
      action: 'column_updated',
      details: { columnId: column._id, title: column.title }
    });
    await activity.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.boardId).emit('column:updated', {
        boardId: board._id,
        column
      });
      if (board.isPublic && board.publicId) {
        io.to(board.publicId).emit('public-board:column-updated', {
          boardId: board._id,
          column: column.toObject()
        });
      }
    }

    res.json(column);
  } catch (err) {
    next(err);
  }
});

// Delete column
router.delete('/:boardId/columns/:columnId', isOwnerOrMember, async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) {
      return res.status(404).json({ error: true, message: 'Board not found.', code: 404 });
    }

    const column = board.columns.id(req.params.columnId);
    if (!column) {
      return res.status(404).json({ error: true, message: 'Column not found.', code: 404 });
    }

    // Delete all tasks associated with the column
    await Task.deleteMany({ _id: { $in: column.tasks } });

    column.remove();
    await board.save();

    // Log activity
    const activity = new Activity({
      boardId: board._id,
      userId: req.user.id,
      action: 'column_deleted',
      details: { columnId: column._id, title: column.title }
    });
    await activity.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(board._id.toString()).emit('column:deleted', {
        boardId: board._id,
        columnId: req.params.columnId
      });
      if (board.isPublic && board.publicId) {
        io.to(board.publicId).emit('public-board:column-deleted', {
          boardId: board._id,
          columnId: req.params.columnId
        });
      }
    }

    res.status(200).json({ message: 'Column deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// Delete board
router.delete('/:boardId', isOwnerOrMember, async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) {
      return res.status(404).json({ error: true, message: 'Board not found.', code: 404 });
    }

    // Delete all tasks associated with the board
    await Task.deleteMany({ board: req.params.boardId });

    await Board.findByIdAndDelete(req.params.boardId);

    // Log activity
    const activity = new Activity({
      boardId: req.params.boardId,
      userId: req.user.id,
      action: 'board_deleted',
      details: { title: board.title }
    });
    await activity.save();

    // Emit socket event
    req.app.get('io').emit('board:deleted', {
      boardId: req.params.boardId
    });

    res.status(200).json({ message: 'Board deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// Invite member to board
router.post('/:boardId/members', isOwnerOrMember, [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg, code: 400 });
    }

    const { email } = req.body;
    const board = await Board.findById(req.params.boardId);
    if (!board) {
      return res.status(404).json({ error: true, message: 'Board not found.', code: 404 });
    }

    const userToInvite = await User.findOne({ email });
    if (!userToInvite) {
      return res.status(404).json({ error: true, message: 'User not found.', code: 404 });
    }

    if (board.members.includes(userToInvite._id) || board.ownerId.equals(userToInvite._id)) {
      return res.status(400).json({ error: true, message: 'User is already a member or owner of this board.', code: 400 });
    }

    board.members.push(userToInvite._id);
    await board.save();

    // Log activity
    const activity = new Activity({
      boardId: board._id,
      userId: req.user.id,
      action: 'member_invited',
      details: { memberId: userToInvite._id, memberEmail: userToInvite.email }
    });
    await activity.save();

    // Emit socket event
    req.app.get('io').to(req.params.boardId).emit('board:member-added', {
      boardId: board._id,
      member: userToInvite
    });

    res.status(200).json({ message: 'Member invited successfully.', member: userToInvite });
  } catch (err) {
    console.error('Error adding member to board:', err);
    next(err);
  }
});

// Remove member from board
router.delete('/:boardId/members/:memberId', isOwnerOrMember, async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) {
      return res.status(404).json({ error: true, message: 'Board not found.', code: 404 });
    }

    const memberToRemove = await User.findById(req.params.memberId);
    if (!memberToRemove) {
      return res.status(404).json({ error: true, message: 'Member not found.', code: 404 });
    }

    if (board.ownerId.equals(memberToRemove._id)) {
      return res.status(400).json({ error: true, message: 'Cannot remove board owner.', code: 400 });
    }

    const initialMemberCount = board.members.length;
    board.members = board.members.filter(member => !member.equals(memberToRemove._id));

    if (board.members.length === initialMemberCount) {
      return res.status(404).json({ error: true, message: 'Member not found in board.', code: 404 });
    }

    await board.save();

    // Log activity
    const activity = new Activity({
      boardId: board._id,
      userId: req.user.id,
      action: 'member_removed',
      details: { memberId: memberToRemove._id, memberEmail: memberToRemove.email }
    });
    await activity.save();

    // Emit socket event
    req.app.get('io').to(req.params.boardId).emit('board:member-removed', {
      boardId: board._id,
      memberId: memberToRemove._id
    });

    res.status(200).json({ message: 'Member removed successfully.' });
  } catch (err) {
    next(err);
  }
});

// Get comments for a task
router.get('/:boardId/tasks/:taskId/comments', isOwnerOrMember, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId).populate({
      path: 'comments',
      populate: {
        path: 'userId',
        select: 'name avatar'
      }
    });

    if (!task) {
      return res.status(404).json({ error: true, message: 'Task not found.', code: 404 });
    }

    res.status(200).json(task.comments);
  } catch (err) {
    next(err);
  }
});

// Add comment to task
router.post('/:boardId/tasks/:taskId/comments', isOwnerOrMember, [
  body('content').trim().notEmpty().withMessage('Comment content is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg, code: 400 });
    }

    const { content } = req.body;
    const { boardId, taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: true, message: 'Task not found.', code: 404 });
    }

    const comment = new Comment({
      content,
      userId: req.user.id,
      taskId,
    });
    await comment.save();

    task.comments.push(comment._id);
    await task.save();

    // Log activity
    const activity = new Activity({
      boardId,
      userId: req.user.id,
      action: 'comment_added',
      details: { taskId, commentId: comment._id, content: comment.content }
    });
    await activity.save();

    // Create notification for board members (excluding the commenter)
    const board = await Board.findById(boardId).populate('members', 'name email avatar');
    if (board) {
      const membersToNotify = board.members.filter(member => !member._id.equals(req.user.id));
      for (const member of membersToNotify) {
        const notification = new Notification({
          userId: member._id,
          type: 'comment_added',
          message: `New comment on task "${task.title}" by ${req.user.name}.`,
          relatedEntities: {
            boardId: board._id,
            taskId: task._id,
            commentId: comment._id
          }
        });
        await notification.save();
        const io = req.app.get('io');
        if (io) {
          io.to(member._id.toString()).emit('notification:new', notification);
        }
      }
    }

    // Emit socket event for real-time update on the board
    req.app.get('io').to(boardId).emit('comment:added', {
      boardId,
      taskId,
      comment: { ...comment.toObject(), user: { _id: req.user.id, name: req.user.name, avatar: req.user.avatar } }
    });

    // Populate the user field for the newly added comment before sending
    await comment.populate('userId', 'name avatar');

    // Find the updated task and populate its comments with user details
    const populatedTask = await Task.findById(taskId)
      .populate({
        path: 'comments',
        populate: {
          path: 'userId',
          select: 'name avatar'
        }
      })
      .populate('assignedUsers', 'name avatar');

    if (!populatedTask) {
      return res.status(404).json({ error: true, message: 'Task not found after comment update.', code: 404 });
    }

    res.status(201).json(populatedTask);
  } catch (err) {
    next(err);
  }
});

// Get comments for a task
router.get('/:boardId/tasks/:taskId/comments', isOwnerOrMember, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const comments = await Comment.find({ taskId }).populate('userId', 'name avatar');
    res.json(comments);
  } catch (err) {
    next(err);
  }
});

// Get attachments for a task
router.get('/:boardId/tasks/:taskId/attachments', isOwnerOrMember, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    console.log(`Fetching attachments for taskId: ${taskId}`);
    const attachments = await Attachment.find({ taskId }).populate('uploadedBy', 'name avatar');
    console.log(`Found attachments: ${JSON.stringify(attachments)}`);
    res.json(attachments);
  } catch (err) {
    console.error('Error in getAttachments route:', err);
    next(err);
  }
});



// Delete attachment from task
router.delete('/:boardId/tasks/:taskId/attachments/:attachmentId', isOwnerOrMember, async (req, res, next) => {
  try {
    const { boardId, taskId, attachmentId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: true, message: 'Task not found.', code: 404 });
    }

    const attachmentIndex = task.attachments.findIndex(att => att._id.toString() === attachmentId);
    if (attachmentIndex === -1) {
      return res.status(404).json({ error: true, message: 'Attachment not found.', code: 404 });
    }

    const [deletedAttachment] = task.attachments.splice(attachmentIndex, 1);
    await task.save();

    // Log activity
    const activity = new Activity({
      boardId,
      userId: req.user.id,
      action: 'attachment_removed',
      details: { taskId, filename: deletedAttachment.filename },
    });
    await activity.save();

    // Emit socket event
    req.app.get('io').to(boardId).emit('task:attachment-removed', {
      boardId,
      taskId,
      attachmentId,
    });

    res.status(200).json({ message: 'Attachment deleted successfully.' });
  } catch (err) {
    console.error('Error deleting attachment:', err);
    res.status(500).json({ error: true, message: 'Error deleting attachment.', code: 500 });
    next(err);
  }
});

// Get comments for a task
router.get('/:boardId/tasks/:taskId/comments', isOwnerOrMember, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const comments = await Comment.find({ taskId }).populate('userId', 'name avatar');
    res.json(comments);
  } catch (err) {
    next(err);
  }
});

// Get attachments for a task
router.get('/:boardId/tasks/:taskId/attachments', isOwnerOrMember, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: true, message: 'Task not found.', code: 404 });
    }
    res.json(task.attachments);
  } catch (err) {
    next(err);
  }
});

router.post('/gemini/suggest-task', authenticateToken, async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const suggestions = await generateTaskSuggestions(title, description);
    res.json(suggestions);
  } catch (err) {
    next(err);
  }
});

export default router;