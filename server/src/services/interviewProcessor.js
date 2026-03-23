import InterviewSession from '../models/InterviewSession.js';
import { evaluateResponse, analyzePerformance } from '../modules/ai-engine/geminiService.js';
import { upsertInterviewTranscript } from './vectorService.js';

/**
 * Core logic to process a user's interview response.
 * Replaced complex XState V5 functional transitions with stable logic.
 */
export const processInterviewTurn = async (sessionId, userMessage) => {
  console.log(`[Processor] Processing turn for session ${sessionId}`);

  const session = await InterviewSession.findById(sessionId);
  if (!session) throw new Error('Session not found');

  // 1. EVALUATE Current Answer
  const currentLevel = session.currentLevel; // 'easy', 'medium', or 'hard'
  const qIndex = session.currentQuestionIndex;
  const currentQuestion = session.questions[currentLevel][qIndex];
  
  console.log(`[Processor] Evaluating Level: ${currentLevel}, Question: ${qIndex + 1}/5`);

  const evaluation = await evaluateResponse(currentQuestion, userMessage, { 
    role: session.role, 
    stack: session.stack 
  });
  
  // 2. LOG TURN
  session.transcript.push({ 
    role: 'user', 
    text: userMessage || "(No response)",
    evaluation: {
      rating: evaluation.rating,
      correction: evaluation.correction
    }
  });

  // 3. UPDATE SCORE
  if (evaluation.rating === 'CORRECT') {
    session.levelScores[currentLevel] = (session.levelScores[currentLevel] || 0) + 1;
    session.markModified('levelScores'); 
  }

  // 4. ORCHESTRATE (Transition Logic)
  const isLastQuestionInLevel = qIndex >= 4;
  const levelScore = session.levelScores[currentLevel];
  const passesLevel = levelScore >= 3;

  let nextLevel = currentLevel;
  let nextIndex = qIndex + 1;
  let triggerAudit = false;

  if (isLastQuestionInLevel) {
    if (!passesLevel) {
      console.log(`[Processor] Level ${currentLevel} failed (Score: ${levelScore}/5). Ending interview.`);
      triggerAudit = true;
    } else {
      // Advance Level
      if (currentLevel === 'easy') {
        console.log(`[Processor] Easy level passed. Moving to Medium.`);
        nextLevel = 'medium';
        nextIndex = 0;
      } else if (currentLevel === 'medium') {
        console.log(`[Processor] Medium level passed. Moving to Hard.`);
        nextLevel = 'hard';
        nextIndex = 0;
      } else {
        console.log(`[Processor] Hard level complete. Moving to Final Audit.`);
        triggerAudit = true;
      }
    }
  }

  if (triggerAudit) {
    try {
      console.log(`[Processor] Interview complete. Triggering final technical audit...`);
      const finalAudit = await analyzePerformance(session.transcript, session.userId);
      
      // Map to sub-document fields explicitly
      session.score = {
        technical: finalAudit.technical || 0,
        communication: finalAudit.communication || 0,
        overall: finalAudit.overall || 0,
        solidAreas: finalAudit.solidAreas || [],
        areasToImprove: finalAudit.areasToImprove || [],
        areasToLearn: finalAudit.areasToLearn || []
      };
      
      session.feedback = finalAudit.feedback || "Audit completed.";
      session.status = 'completed';
      
      console.log(`[Processor] Final report generated for session ${sessionId}`);
      
      // Background: Upsert to Vector DB if possible
      upsertInterviewTranscript(session.userId, sessionId, session.transcript).catch(e => console.warn("[VectorDB Error] Audit upsert failed:", e.message));
    } catch (auditError) {
      console.error("[Processor Error] Audit failed:", auditError.message);
      session.status = 'completed'; // Ensure session ends even if audit fails
    }
  } else {
    // Select next question from the bank
    const nextQuestionText = session.questions[nextLevel][nextIndex];
    session.currentLevel = nextLevel;
    session.currentQuestionIndex = nextIndex;
    session.transcript.push({ role: 'ai', text: nextQuestionText });
    console.log(`[Processor] Next Question Prepared: ${nextLevel} [${nextIndex}]`);
  }

  await session.save();
  return session;
};
