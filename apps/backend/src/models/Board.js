import mongoose from 'mongoose';
import Task from './Task.js';

const columnSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }]
});

const boardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  columns: [columnSchema],
  taskCounter: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  publicId: {
    type: String,
    unique: true,
    sparse: true
  },
  isPubliclyShareable: {
    type: Boolean,
    default: false
  },
  publicShareLink: {
    type: String,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Board || mongoose.model('Board', boardSchema);