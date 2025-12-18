import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema ({
  fileName: String ,
  fileType: String ,
  url: String ,
  publicId: String ,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User"  },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task"  },
}, { timestamps: true  });

export default mongoose.model("Attachment" , attachmentSchema);