import mongoose from 'mongoose';

const geminiSuggestionSchema = new mongoose.Schema({
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    required: true,
  },
  deadline: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
});

export default mongoose.model('GeminiSuggestion', geminiSuggestionSchema);
