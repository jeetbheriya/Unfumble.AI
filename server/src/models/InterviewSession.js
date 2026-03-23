import mongoose from 'mongoose';

const interviewSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: String,
  stack: [String],
  resumeText: String,
  
  // PRE-GENERATED QUESTION BANK
  questions: {
    easy: [String],
    medium: [String],
    hard: [String]
  },
  
  // LEVEL TRACKING
  currentLevel: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
  currentQuestionIndex: { type: Number, default: 0 },
  
  // SCORING BY LEVEL (Tracks CORRECT counts)
  levelScores: {
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 }
  },
  
  transcript: [
    {
      role: { type: String, enum: ['ai', 'user'] },
      text: String,
      evaluation: {
        rating: { type: String, enum: ['CORRECT', 'PARTIAL', 'WRONG'] },
        correction: String
      },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  
  score: {
    technical: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    overall: { type: Number, default: 0 },
    solidAreas: [String],
    areasToImprove: [String],
    areasToLearn: [String]
  },
  
  feedback: { type: String, default: "" },
  status: { type: String, enum: ['ongoing', 'completed'], default: 'ongoing' },
  createdAt: { type: Date, default: Date.now }
});

const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);
export default InterviewSession;
