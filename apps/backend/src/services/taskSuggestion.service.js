const Board = require('../models/Board');
const User = require('../models/User');

// Helper function to calculate average completion time
const calculateAverageCompletionTime = (tasks) => {
  if (tasks.length === 0) return 0;
  const totalCompletionTime = tasks.reduce((acc, task) => {
    if (task.completedAt && task.createdAt) {
      return acc + (task.completedAt - task.createdAt);
    }
    return acc;
  }, 0);
  return totalCompletionTime / tasks.length;
};

// Main suggestion function
async function suggest({ userId, boardId }) {
  try {
    // 1. Load user's pending tasks
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const board = await Board.findById(boardId).populate({
      path: 'columns',
      populate: {
        path: 'tasks',
        model: 'Task',
        populate: [
          { path: 'assignedUsers', model: 'User' },
          { path: 'attachments', model: 'Attachment' },
        ],
      },
    });

    if (!board) {
      throw new Error('Board not found');
    }

    const allTasks = board.columns.flatMap((column) => column.tasks);
    const userTasks = allTasks.filter(
      (task) =>
        task.assignedUsers &&
        task.assignedUsers.some((assignee) => assignee._id.equals(userId))
    );

    const pendingTasks = userTasks.filter((task) => task.status !== 'completed');
    const completedTasks = userTasks.filter((task) => task.status === 'completed');

    // 2. Analyze workload and suggest priority
    let suggestedPriority = 'Medium';
    if (pendingTasks.length > 5) {
      suggestedPriority = 'High';
    } else if (pendingTasks.length > 2) {
      suggestedPriority = 'Medium';
    } else {
      suggestedPriority = 'Low';
    }

    // 3. Analyze performance and suggest deadline
    const avgCompletionTime = calculateAverageCompletionTime(completedTasks);
    let suggestedDueInDays = 2; // Default suggestion

    if (avgCompletionTime > 3 * 24 * 60 * 60 * 1000) { // 3 days in ms
      suggestedDueInDays = 5;
    } else if (avgCompletionTime > 1 * 24 * 60 * 60 * 1000) { // 1 day in ms
      suggestedDueInDays = 3;
    }

    // Adjust due date based on current workload
    if (pendingTasks.length > 4) {
      suggestedDueInDays += 2;
    } else if (pendingTasks.length > 2) {
      suggestedDueInDays += 1;
    }

    return {
      suggestedPriority,
      suggestedDueInDays,
    };
  } catch (error) {
    console.error('Error in suggestion service:', error);
    throw error;
  }
}

module.exports = {
  suggest,
};