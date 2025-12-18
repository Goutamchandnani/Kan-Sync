import Activity from '../models/Activity.js';

class ActivityService {
  constructor(io) {
    this.io = io;
  }

  async logActivity(boardId, userId, action, details = {}) {
    console.log(`Attempting to log activity: boardId=${boardId}, userId=${userId}, action=${action}`);
    try {
      const activity = new Activity({
        boardId,
        userId,
        action,
        details
      });
      await activity.save();
      console.log('Activity object after save (activity.service.js):', activity);

      // Populate the userId field before emitting
      const populatedActivity = await Activity.findById(activity._id).populate('userId', 'name email avatar');

      // Emit activity to board room
      this.io.to(`board:${boardId}`).emit('activity:created', populatedActivity);
      return populatedActivity;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }
}

export default ActivityService;