import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Document } from "@langchain/core/documents";
import dotenv from 'dotenv';

dotenv.config();

const pineconeApiKey = process.env.PINECONE_API_KEY;
let pc = null;
let index = null;

if (pineconeApiKey) {
  try {
    pc = new Pinecone({
      apiKey: pineconeApiKey,
    });
    index = pc.Index(process.env.PINECONE_INDEX || 'interview-pro');
    console.log('✅ Pinecone initialized');
  } catch (error) {
    console.error('❌ Pinecone initialization failed:', error.message);
  }
} else {
  console.warn('⚠️ PINECONE_API_KEY not found. Vector features will be disabled.');
}

const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "gemini-embedding-001", // Verified from your discovered models list
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * 1. Upsert Interview Transcript
 * Stores the results of an interview session for future retrieval.
 */
export const upsertInterviewTranscript = async (userId, sessionId, transcript) => {
  if (!index) {
    console.warn('[VectorDB] Skipping upsert: Pinecone not initialized.');
    return;
  }
  try {
    const textContent = transcript
      .map(t => `${t.role.toUpperCase()}: ${t.text} ${t.evaluation ? `(Rating: ${t.evaluation.rating}, Feedback: ${t.evaluation.correction})` : ''}`)
      .join('\n');

    const doc = new Document({
      pageContent: textContent,
      metadata: { userId: userId.toString(), sessionId: sessionId.toString(), date: new Date().toISOString() },
    });

    await PineconeStore.fromDocuments([doc], embeddings, {
      pineconeIndex: index,
      namespace: userId.toString(), // Namespace by user for fast multi-tenant lookup
    });

    console.log(`[VectorDB] Transcript upserted for session ${sessionId}`);
  } catch (error) {
    console.error('[VectorDB Error] Upsert failed:', error);
  }
};

/**
 * 2. Retrieve Past Performance Context
 * Finds relevant past feedback to prime the next interview.
 */
export const getPastPerformanceContext = async (userId, currentRole) => {
  if (!index) {
    console.warn('[VectorDB] Skipping retrieval: Pinecone not initialized.');
    return "No previous interview data found (Vector DB disabled).";
  }
  try {
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      namespace: userId.toString(),
    });

    // Search for past feedback related to the current role or general performance
    const results = await vectorStore.similaritySearch(currentRole, 3);
    
    if (results.length === 0) return "No previous interview data found.";

    return results.map(r => r.pageContent).join('\n---\n');
  } catch (error) {
    console.warn('[VectorDB Context] No history retrieved:', error.message);
    return "Could not retrieve past history.";
  }
};
