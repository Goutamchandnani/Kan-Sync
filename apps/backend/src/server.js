import fs from 'fs';
import path from 'path';

// Create a write stream for logging
const logStream = fs.createWriteStream(path.join(process.cwd(), 'backend_console.log'), { flags: 'a' });

// Redirect console.log to the file
const originalConsoleLog = console.log;
console.log = (...args) => {
  originalConsoleLog(...args);
  logStream.write(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ') + '\n');
};

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import boardRoutes from './routes/board.js';
import publicRoutes from './routes/public.js';
import attachmentRoutes from './routes/attachments.js';
import { authenticateToken } from './middleware/auth.js';
import Board from './models/Board.js';
import Task from './models/Task.js';
import Activity from './models/Activity.js';
import GeminiSuggestion from './models/GeminiSuggestion.js';
import errorHandler from './middleware/errorHandler.js';
import SocketService from './services/socket.service.js';

dotenv.config({ path: './.env' });
const app = express();
app.use(cors({ origin: ['https://kansync.app', 'https://landing.kansync.app', 'https://kan-sync.netlify.app'], credentials: true, allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());
app.use(morgan('dev'));
// app.use(helmet());

app.options('*', cors()); // Handle preflight OPTIONS requests

const server = http.createServer(app);
// export const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL } });
const socketService = new SocketService(server);
app.set('io', socketService.io);

// Basic socket auth example
// io.use((socket, next) => {
//   const token = socket.handshake.auth?.token;
//   if (!token) return next(new Error('Auth error'));
//   // verify token (use jwt.verify) and attach user to socket
//   next();
// });

// io.on('connection', (socket) => {
//   socket.on('join-board', ({ boardId }) => {
//     socket.join(`board:${boardId}`);
//     // emit presence-update etc.
//   });

//   socket.on('task-move', async ({ boardId, taskId, sourceColumnId, destinationColumnId, sourceIndex, destinationIndex }, ack) => {
//     try {
//       // 1. Validate input
//       if (!boardId || !taskId || !sourceColumnId || !destinationColumnId || sourceIndex === undefined || destinationIndex === undefined) {
//         return ack({ ok: false, message: 'Missing required task move data.' });
//       }

//       // 2. Find the board
//       const board = await Board.findById(boardId);
//       if (!board) {
//         return ack({ ok: false, message: 'Board not found.' });
//       }

//       // 3. Find source and destination columns
//       const sourceColumn = board.columns.id(sourceColumnId);
//       const destinationColumn = board.columns.id(destinationColumnId);

//       if (!sourceColumn || !destinationColumn) {
//         return ack({ ok: false, message: 'Source or destination column not found.' });
//       }

//       // 4. Find the task in the source column
//       const taskIndex = sourceColumn.tasks.findIndex(task => task.equals(taskId));
//       if (taskIndex === -1) {
//         return ack({ ok: false, message: 'Task not found in source column.' });
//       }

//       // 5. Remove task from source column
//       const [taskToMove] = sourceColumn.tasks.splice(taskIndex, 1);

//       // 6. Add task to destination column at the specified index
//       destinationColumn.tasks.splice(destinationIndex, 0, taskToMove);

//       // 7. Save the updated board
//       await board.save();

//       // 8. Create activity log
//       await Activity.create({
//         boardId,
//         userId: socket.user.id, // Assuming socket.user is populated from auth middleware
//         action: 'task_moved',
//         details: {
//           taskId,
//           sourceColumnId,
//           destinationColumnId,
//           sourceIndex,
//           destinationIndex
//         }
//       });

//       // 9. Emit update to all clients in the board room
//       io.to(`board:${boardId}`).emit('task-moved', {
//         boardId,
//         taskId,
//         sourceColumnId,
//         destinationColumnId,
//         sourceIndex,
//         destinationIndex
//       });

//       // 10. Acknowledge the client
//       ack({ ok: true });
//     } catch (error) {
//       console.error('Error handling task-move:', error);
//       ack({ ok: false, message: 'Server error during task move.' });
//     }
//   });

//   socket.on('disconnect', () => {/* handle presence cleanup */});
// });

mongoose.connect(process.env.MONGODB_URI)
  .then(() => server.listen(process.env.PORT, () => console.log(`Server up on port ${process.env.PORT}`)));

app.use('/api/auth', authRoutes);
app.use('/api', attachmentRoutes);
app.use('/api/boards', authenticateToken, boardRoutes);
app.use('/api/public', publicRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Backend is running" });
});

app.use(errorHandler);