import User from '../models/User.js';
import InterviewSession from '../models/InterviewSession.js';
import { parseResume } from '../modules/resume-parser/parser.js';
import { analyzeResume, evaluateResponse, analyzePerformance } from '../modules/ai-engine/geminiService.js';

/**
 * 1. Process Resume & Pre-Generate 15 Questions (RAG SUPPORTED)
 */
export const processResume = async (req, res) => {
  console.log('--- ENTERING processResume CONTROLLER ---');
  console.log('Request Headers Authorization exists:', !!req.headers.authorization);
  console.log('req.auth object exists:', !!req.auth);
  if (req.auth) {
      console.log('req.auth keys:', Object.keys(req.auth));
      console.log('req.auth.userId:', req.auth.userId);
  }
  
  try {
    console.log('--- START PROCESS RESUME LOGIC ---');
    if (!req.file) {
      console.warn('ProcessResume: No file uploaded');
      return res.status(400).json({ message: 'No file' });
    }

    console.log('DEBUG: req.auth:', JSON.stringify(req.auth, null, 2));
    let clerkId = req.auth?.userId;
    
    // --- DEBUG FALLBACK ---
    if (!clerkId) {
        console.warn('ProcessResume: No clerkId found, using DEBUG_USER for trace.');
        // Use a dummy ID for testing purposes only
        clerkId = 'user_debug_123'; 
    }
    // --- END DEBUG FALLBACK ---

    console.log('ProcessResume: Finding/Creating User for clerkId:', clerkId);
    let user;
    try {
      // 1. Try to find user by clerkId first
      user = await User.findOne({ clerkId: clerkId });

      if (!user && req.body.email) {
          console.log('ProcessResume: User not found by clerkId, checking email:', req.body.email);
          // 2. If not found, check if email exists (maybe they signed in with a different method before)
          user = await User.findOne({ email: req.body.email });
          if (user && !user.clerkId) {
              user.clerkId = clerkId;
              await user.save();
              console.log('✅ Linked existing email record to new clerkId');
          }
      }

      if (!user) {
          console.log('ProcessResume: Creating new user record...');
          user = new User({
              clerkId: clerkId,
              name: req.body.name || 'New User',
              email: req.body.email
          });
          await user.save();
      } else {
          // Update name if provided
          if (req.body.name) user.name = req.body.name;
          await user.save();
          console.log('✅ Existing user record updated:', user._id);
      }
    } catch (dbError) {
      console.error('❌ Database error during user management:', dbError);
      return res.status(500).json({ message: 'Database error', error: dbError.message });
    }


    console.log('ProcessResume: Parsing PDF buffer (length:', req.file.buffer.length, ')');
    let resumeText;
    try {
        resumeText = await parseResume(req.file.buffer);
        console.log('✅ PDF parsing successful. Length:', resumeText.length);
    } catch (parseErr) {
        console.error('❌ PDF PARSING FAILED:', parseErr);
        return res.status(400).json({ message: 'Could not extract text from PDF.', error: parseErr.message });
    }

    if (!resumeText || resumeText.length < 50) {
        console.error('❌ PDF parsing returned empty or too short text');
        return res.status(400).json({ message: 'Could not extract text from PDF.' });
    }
    
    console.log('ProcessResume: Starting AI analysis (RAG-Aware)...');
    let analysis;
    try {
        analysis = await analyzeResume(resumeText, user._id);
        console.log('✅ AI Analysis complete for role:', analysis.role);
    } catch (aiErr) {
        console.error('❌ AI ANALYSIS FAILED:', aiErr);
        return res.status(500).json({ message: 'AI Analysis failed', error: aiErr.message });
    }
    
    user.resumeText = resumeText;
    await user.save();
    console.log('✅ User resume text updated.');

    console.log('--- FINISHED PROCESS RESUME SUCCESSFULLY ---');
    res.status(200).json({ 
      user, 
      role: analysis.role, 
      stack: analysis.stack,
      resumeText,
      questions: analysis.questions,
      firstQuestion: analysis.questions.easy[0]
    });
  } catch (error) {
    console.error('CRITICAL ERROR in processResume:', error);
    res.status(500).json({ message: 'Error analyzing resume', error: error.message });
  }
};

/**
 * 2. Start Session with Pre-Generated Bank
 */
export const startSession = async (req, res) => {
  try {
    const { userId, role, stack, questions, resumeText } = req.body;
    
    const session = new InterviewSession({ 
      userId, role, stack, resumeText,
      questions, // Save the 15-question bank
      currentLevel: 'easy',
      currentQuestionIndex: 0,
      transcript: [{ role: 'ai', text: questions.easy[0] }]
    });
    
    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Error starting session' });
  }
};

import { geminiQueue } from '../queues/geminiQueue.js';
import { processInterviewTurn } from '../services/interviewProcessor.js';

/**
 * 3. Submit Response (RESILIENCE: Redis + BullMQ with Sync Fallback)
 */
export const submitResponse = async (req, res) => {
  try {
    const { sessionId, userMessage } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required.' });
    }

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }
    
    if (session.status === 'completed') {
      return res.status(400).json({ message: 'Session already completed' });
    }

    // Try to use the Queue for Resilience
    /* 
    try {
      // Robust check if queue is initialized and ready
      if (geminiQueue && geminiQueue.add) {
        const client = await geminiQueue.client;
        if (client && client.status === 'ready') {
          const job = await geminiQueue.add('process-evaluation', { sessionId, userMessage });
          console.log(`[Controller] Job ${job.id} queued.`);
          return res.status(202).json({ 
            status: 'accepted',
            message: 'Synthesizing evaluation and next question...',
            jobId: job.id
          });
        }
      }
    } catch (queueError) {
      console.warn('[Queue Fallback] Queue failed or not ready:', queueError.message);
    }
    */

    // FALLBACK: Synchronous Processing if Redis is missing
    console.log('[Controller] Processing synchronously (No Redis)...');
    const updatedSession = await processInterviewTurn(sessionId, userMessage);
    
    // Robustly find the latest user turn and the latest AI turn
    const transcript = updatedSession.transcript;
    const userTurns = transcript.filter(t => t.role === 'user');
    const lastUserTurn = userTurns[userTurns.length - 1];
    
    const aiTurns = transcript.filter(t => t.role === 'ai');
    const lastAiTurn = aiTurns[aiTurns.length - 1];
    const secondLastAiTurn = aiTurns[aiTurns.length - 2];

    // If session just ended, the 'nextQuestion' might not exist or be the one we just answered
    // The nextQuestion should be the one that was JUST added by the processor
    // If triggerAudit was true, no new AI turn was added.
    const isCompleted = updatedSession.status === 'completed';
    const nextQuestion = isCompleted ? null : lastAiTurn?.text;

    res.status(200).json({
      status: 'completed',
      message: 'Evaluation complete',
      session: updatedSession,
      evaluation: lastUserTurn?.evaluation || { rating: 'PARTIAL', correction: 'Evaluation data missing.' },
      nextQuestion: nextQuestion,
      shouldEnd: isCompleted
    });

  } catch (error) {
    console.error('[Controller Error]:', error);
    res.status(500).json({ message: 'Error processing response', error: error.message });
  }
};

export const getResults = async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.sessionId);
    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Results error' });
  }
};

export const getUserHistory = async (req, res) => {
  try {
    let clerkId = req.auth?.userId;
    
    // Fallback for debug/testing
    if (!clerkId) {
      console.warn('[History] No clerkId found, looking for latest user (DEBUG MODE)');
      const latestUser = await User.findOne().sort({ createdAt: -1 });
      if (!latestUser) return res.status(404).json({ message: 'No users found.' });
      clerkId = latestUser.clerkId;
    }

    // 1. Find our internal User ID based on the Clerk ID
    const user = await User.findOne({ clerkId });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // 2. Fetch all COMPLETED sessions for this user
    const history = await InterviewSession.find({ 
      userId: user._id,
      status: 'completed' 
    }).sort({ createdAt: -1 });

    res.status(200).json(history);
  } catch (error) {
    console.error('[History Error]:', error);
    res.status(500).json({ message: 'Error fetching history', error: error.message });
  }
};
