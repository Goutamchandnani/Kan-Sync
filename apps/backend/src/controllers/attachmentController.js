import Attachment from '../models/Attachment.js';
import cloudinary from '../config/cloudinary.js';

export const uploadAttachment = async  (req, res, next) => {
  try {
    const file = req.file ;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({ message: `Unsupported file type: ${file.mimetype}. Only JPG, PNG, and PDF are allowed.` });
    }

    // Convert buffer to data URI
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    // Determine resource type based on mimetype
    const resourceType = file.mimetype.startsWith('image/') ? 'image' : 'raw';

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "kansync/tasks" ,
      resource_type: resourceType,
    });

    const attachment = await Attachment.create ({
      fileName: file.originalname ,
      fileType: file.mimetype ,
      url: result.secure_url ,
      publicId: result.public_id ,
      uploadedBy: req.user.id ,
      taskId: req.params.taskId ,
    });

    res.status(201).json (attachment);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    next(error); // Pass the error to the error handling middleware
  }
};

export const deleteAttachment = async (req, res, next) => {
  try {
    const { attachmentId } = req.params;

    const attachment = await Attachment.findById(attachmentId);

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found.' });
    }

    // Delete from Cloudinary
    if (attachment.publicId) {
      await cloudinary.uploader.destroy(attachment.publicId);
    }

    // Delete from database
    await Attachment.findByIdAndDelete(attachmentId);

    res.status(200).json({ message: 'Attachment deleted successfully.' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    next(error);
  }
};