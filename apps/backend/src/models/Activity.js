import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'board_created',
      'board_updated',
      'board_deleted',
      'column_created',
      'column_updated',
      'column_deleted',
      'task_created',
      'task_updated',
      'task_moved',
      'task_deleted',
      'member_added',
      'member_removed',
      'member_invited',
      'user_joined_board',
      'user_left_board',
      'board_shared_publicly'
    ]
  },
  details: {
    type: Object,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Activity', activitySchema);