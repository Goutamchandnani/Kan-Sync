import express from 'express';
import Board from '../models/Board.js';
import User from '../models/User.js';

const router = express.Router();

// GET /api/public/boards/:id
router.get('/boards/share/:publicId', async (req, res, next) => {
  try {
    const board = await Board.findOne({ publicId: req.params.publicId, isPublic: true })
      .populate({
        path: 'columns',
        populate: {
          path: 'tasks',
          model: 'Task',
          select: '-__v -createdAt -updatedAt -assignedTo -attachments -comments -activityLog' // Sanitize task data
        },
        select: '-__v -createdAt -updatedAt' // Sanitize column data
      })
      .select('-__v -createdAt -updatedAt -members -activityLog -ownerId'); // Sanitize board data

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Further sanitize board data before sending
    const sanitizedBoard = board.toObject();
    if (sanitizedBoard.columns) {
      sanitizedBoard.columns.forEach((column) => {
        if (column.tasks) {
          column.tasks.forEach((task) => {
            delete task.assignedTo;
            delete task.attachments;
            delete task.comments;
            delete task.activityLog;
          });
        }
      });
    }
    delete sanitizedBoard.members;
    delete sanitizedBoard.activityLog;

    res.json(sanitizedBoard);
  } catch (error) {
    next(error);
  }
});

export default router;