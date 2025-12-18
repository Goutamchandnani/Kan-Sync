import { Router } from 'express';
import upload from '../middleware/upload.js';
import { uploadAttachment, deleteAttachment } from '../controllers/attachmentController.js';
import { authenticateToken as auth } from '../middleware/auth.js';

const router = Router();

router.post (
  "/boards/:boardId/tasks/:taskId/attachments" ,
  auth,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ message: err.message, code: err.code });
      }
      next();
    });
  },
  uploadAttachment
);

router.delete("/boards/:boardId/tasks/:taskId/attachments/:attachmentId", auth, deleteAttachment);

export default router;