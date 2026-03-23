import { createMachine, assign } from 'xstate';

/**
 * Interview State Machine (XState V5 Syntax)
 * Deterministically controls the flow of the AI Interview.
 */
export const interviewMachine = createMachine({
  id: 'interview',
  initial: 'easy',
  context: {
    score: 0,
    questionIndex: 0,
    maxQuestions: 5,
    minPassingScore: 3,
  },
  states: {
    easy: {
      on: {
        SUBMIT_ANSWER: [
          {
            target: 'medium',
            guard: ({ context, event }) => 
              event.isLastQuestion && event.levelScore >= context.minPassingScore,
            actions: assign({ questionIndex: 0, score: 0 })
          },
          {
            target: 'audit',
            guard: ({ context, event }) => 
              event.isLastQuestion && event.levelScore < context.minPassingScore
          },
          {
            actions: assign({ 
              questionIndex: ({ context }) => context.questionIndex + 1 
            })
          }
        ]
      }
    },
    medium: {
      on: {
        SUBMIT_ANSWER: [
          {
            target: 'hard',
            guard: ({ context, event }) => 
              event.isLastQuestion && event.levelScore >= context.minPassingScore,
            actions: assign({ questionIndex: 0, score: 0 })
          },
          {
            target: 'audit',
            guard: ({ context, event }) => 
              event.isLastQuestion && event.levelScore < context.minPassingScore
          },
          {
            actions: assign({ 
              questionIndex: ({ context }) => context.questionIndex + 1 
            })
          }
        ]
      }
    },
    hard: {
      on: {
        SUBMIT_ANSWER: [
          {
            target: 'audit',
            guard: ({ event }) => event.isLastQuestion
          },
          {
            actions: assign({ 
              questionIndex: ({ context }) => context.questionIndex + 1 
            })
          }
        ]
      }
    },
    audit: {
      type: 'final'
    }
  }
});
