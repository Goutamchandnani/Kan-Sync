import jwt from 'jsonwebtoken';
import Board from '../models/Board.js';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

const isOwnerOrMember = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const isOwner = board.ownerId.equals(req.user.id);
    const isMember = board.members.some(memberId => memberId.equals(req.user.id));

    if (!isOwner && !isMember && !board.isPublic) {
      return res.status(403).json({ message: 'Access denied' });
    }

    req.board = board;
    req.isOwner = isOwner;
    next();
  } catch (err) {
    next(err);
  }
};

export { authenticateToken, isOwnerOrMember };