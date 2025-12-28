import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['task_assigned', 'task_updated', 'task_deleted', 'user_joined_board', 'user_left_board', 'comment_added']
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  relatedEntities: {
    boardId: mongoose.Schema.Types.ObjectId,
    taskId: mongoose.Schema.Types.ObjectId,
    commentId: mongoose.Schema.Types.ObjectId
  }
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;