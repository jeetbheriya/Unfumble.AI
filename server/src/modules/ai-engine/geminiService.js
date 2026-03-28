import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY?.trim();
console.log(`GEMINI: Initializing with API Key (Length: ${apiKey ? apiKey.length : 0})`);

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * robustly extracts JSON from a string even with conversational filler or markdown.
 */
const extractJson = (text) => {
  if (!text) throw new Error("AI returned empty response.");
  
  let cleaned = text.trim();

  // 1. More robust markdown stripping
  // Matches any block between triple backticks, potentially with 'json' label
  const markdownRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = cleaned.match(markdownRegex);
  if (match && match[1]) {
    cleaned = match[1].trim();
  }

  try {
    // 2. Try direct parse on cleaned text
    return JSON.parse(cleaned);
  } catch (e) {
    try {
      // 3. Fallback: regex for the first { and last }
      // This is very robust for extracting the core JSON object if the model was chatty
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonString = cleaned.substring(firstBrace, lastBrace + 1);
        try {
            return JSON.parse(jsonString);
        } catch (innerError) {
            console.error("JSON.parse error on substring:", innerError.message);
            // Log a snippet of the problematic string for easier debugging
            console.error("String snippet:", jsonString.substring(0, 100) + "...");
            throw innerError;
        }
      }
      throw new Error("No JSON object found in text.");
    } catch (e2) {
      console.error("Final JSON parse attempt failed. Raw text was:", text);
      throw new Error(`AI response contained invalid JSON structure: ${e2.message}`);
    }
  }
};

/**
 * DYNAMIC DISCOVERY: Fetches the list of available models for the API key
 * and selects the first viable Gemini model.
 */
let cachedModelName = null;
let allAvailableModels = [];

const getGenerationModels = async () => {
  if (allAvailableModels.length > 0) return allAvailableModels;

  const tryDiscovery = async (version) => {
    try {
      console.log(`GEMINI: Discovering models via ${version} API...`);
      const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models?key=${apiKey}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.models || [];
    } catch (e) {
      return null;
    }
  };

  try {
    let models = await tryDiscovery('v1beta');
    if (!models || models.length === 0) {
      console.warn("GEMINI: v1beta discovery failed or empty, trying v1...");
      models = await tryDiscovery('v1');
    }

    if (!models || models.length === 0) {
      throw new Error("Could not retrieve any models from Gemini API.");
    }
    
    // Filter for models that support content generation
    allAvailableModels = models.filter(m => 
      m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")
    );

    console.log("GEMINI: Discovered models:", allAvailableModels.map(m => m.name.replace('models/', '')).join(", "));
    return allAvailableModels;
  } catch (error) {
    console.error("GEMINI: Discovery error:", error.message);
    return [];
  }
};

const getActiveModelName = async () => {
  if (cachedModelName) return cachedModelName;

  const envPreferredModel = process.env.GEMINI_MODEL ? 
    (process.env.GEMINI_MODEL.startsWith('models/') ? process.env.GEMINI_MODEL : `models/${process.env.GEMINI_MODEL}`) : 
    null;

  const generationModels = await getGenerationModels();

  if (generationModels.length === 0) {
    return envPreferredModel || "models/gemini-1.5-flash"; 
  }

  // 1. If ENV model exists and is in the list, use it
  if (envPreferredModel) {
    const found = generationModels.find(m => m.name === envPreferredModel);
    if (found) {
      cachedModelName = found.name;
      console.log(`GEMINI: Using preferred model from ENV: ${cachedModelName}`);
      return cachedModelName;
    }
    console.warn(`GEMINI: Preferred model '${envPreferredModel}' not found or not supported. Selecting best available...`);
  }

  // 2. Prioritize stable 1.5-flash
  const flash15 = generationModels.find(m => m.name.includes("gemini-1.5-flash"));
  if (flash15) {
    cachedModelName = flash15.name;
    console.log(`GEMINI: Selected stable model: ${cachedModelName}`);
    return cachedModelName;
  }

  // 3. Fallback to 1.5-pro if available
  const pro15 = generationModels.find(m => m.name.includes("gemini-1.5-pro"));
  if (pro15) {
    cachedModelName = pro15.name;
    console.log(`GEMINI: Falling back to pro model: ${cachedModelName}`);
    return cachedModelName;
  }

  // 4. Last resort: any viable gemini model
  const viableModel = generationModels.find(m => m.name.includes("gemini"));

  if (viableModel) {
    cachedModelName = viableModel.name;
    console.log(`GEMINI: Auto-detected available model: ${cachedModelName}`);
    return cachedModelName;
  }

  return envPreferredModel || "models/gemini-1.5-flash"; 
};

const getFallbackModel = (currentModelName) => {
  if (allAvailableModels.length === 0) return "models/gemini-1.5-flash";

  // Find a model that is NOT the current one and is ideally a "flash" model for speed/quota
  const fallback = allAvailableModels.find(m => m.name !== currentModelName && m.name.includes("flash")) 
               || allAvailableModels.find(m => m.name !== currentModelName);
  
  return fallback ? fallback.name : currentModelName;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const callGeminiDynamic = async (prompt, temperature = 0.7, retries = 3) => {
  let modelName = await getActiveModelName();
  
  for (let i = 0; i < retries; i++) {
    try {
      // Configure for JSON mode if it's a 1.5+ model
      const isJsonCapable = modelName.includes('1.5') || modelName.includes('2.0') || modelName.includes('pro') || modelName.includes('flash');
      
      const generationConfig = { 
        temperature, 
        topP: 0.95, 
        topK: 40,
        responseMimeType: isJsonCapable ? "application/json" : "text/plain"
      };

      const model = genAI.getGenerativeModel({ 
        model: modelName, 
        generationConfig
      });

      console.log(`GEMINI: Calling ${modelName} (JSON Mode: ${isJsonCapable ? 'ON' : 'OFF'})...`);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      if (!response || !response.text) {
        throw new Error("Empty response from Gemini API.");
      }
      
      return response.text();
    } catch (error) {
      const errorMessage = error.message || "";
      const isQuotaError = errorMessage.includes("429") || errorMessage.includes("Quota exceeded");
      const is503Error = errorMessage.includes("503") || errorMessage.includes("overloaded");
      const isNotFoundError = errorMessage.includes("404") || errorMessage.includes("not found");
      const isBlocked = errorMessage.includes("SAFETY") || errorMessage.includes("blocked");
      
      if (isNotFoundError && i < retries - 1) {
        console.warn(`GEMINI: Model ${modelName} not found (404). Refreshing discovery...`);
        allAvailableModels = []; // Force fresh discovery
        cachedModelName = null;
        modelName = await getActiveModelName();
        continue;
      }

      if ((isQuotaError || is503Error) && i < retries - 1) {
        const nextModel = getFallbackModel(modelName);
        if (nextModel !== modelName) {
            console.warn(`GEMINI: Model ${modelName} congested/failed. Falling back to ${nextModel}...`);
            modelName = nextModel;
            continue;
        }
      }

      if (isQuotaError && i < retries - 1) {
        const waitTime = (i + 1) * 5000;
        console.warn(`GEMINI: Quota exceeded. Retrying in ${waitTime}ms... (Attempt ${i + 1}/${retries})`);
        await sleep(waitTime);
        continue;
      }
      
      if (isBlocked) {
        console.error("GEMINI: Content was blocked by safety filters.");
        throw new Error("AI response was blocked for safety reasons.");
      }
      
      console.error(`GEMINI: Failed using model '${modelName}'. Error: ${errorMessage}`);
      if (i === retries - 1) throw error;
      await sleep(1000);
    }
  }
};

import { getPastPerformanceContext } from '../../services/vectorService.js';

// --- CORE SERVICES ---

export const analyzeResume = async (resumeText, userId = null) => {
  try {
    let pastContext = "No previous history found.";
    if (userId) {
      try {
        pastContext = await getPastPerformanceContext(userId, "General Software Engineering");
        console.log(`[RAG] Retrieved context for user ${userId}:`, pastContext.length, "characters");
      } catch (ragError) {
        console.warn("[RAG] Failed to fetch context:", ragError.message);
      }
    }

    const prompt = `
      Analyze this resume and generate 15 interview questions (5 Easy, 5 Medium, 5 Hard).
      RESUME: """${resumeText}"""
      
      USER PAST PERFORMANCE CONTEXT (RAG):
      """${pastContext}"""
      
      INSTRUCTION: If the user has shown weaknesses in previous sessions (mentioned in context above), prioritize generating questions that re-test those specific gaps.

      Return ONLY a JSON object:
      {
        "role": "string",
        "stack": ["string"],
        "questions": {
          "easy": ["string"],
          "medium": ["string"],
          "hard": ["string"]
        }
      }
    `;
    
    console.log("GEMINI: Starting Resume Analysis (RAG-Aware)...");
    const text = await callGeminiDynamic(prompt, 0.8);
    return extractJson(text);
  } catch (error) {
    console.error("CRITICAL AI ERROR (AnalyzeResume):", error);
    throw error;
  }
};

export const evaluateResponse = async (question, answer, context) => {
  try {
    const prompt = `
      Task: Evaluate the candidate's answer for a technical interview.
      Question: "${question}"
      Candidate Answer: "${answer}"
      Target Role: ${context.role || "Software Engineer"}

      Guidelines:
      1. If the answer is factually correct and demonstrates understanding, rate it "CORRECT".
      2. If the answer is partially correct but misses key details, rate it "PARTIAL".
      3. If the answer is incorrect or irrelevant, rate it "WRONG".
      4. Provide a brief, constructive correction or feedback (1-2 sentences).
      5. Determine if the question was technical in nature.

      Output: Return ONLY a valid JSON object. No conversational filler.
      Format: {"rating": "CORRECT"|"PARTIAL"|"WRONG", "correction": "string", "isTechnical": boolean}
    `;

    const text = await callGeminiDynamic(prompt, 0.2);
    return extractJson(text);
  } catch (error) {
    console.error('CRITICAL AI ERROR (EvaluateResponse):', error);
    return { rating: "PARTIAL", correction: "Evaluation skipped due to an internal AI error.", isTechnical: false };
  }
};

export const analyzePerformance = async (transcript, userId = null) => {
  try {
    if (!transcript || transcript.length === 0) {
      throw new Error("Transcript is empty.");
    }

    let pastContext = "No previous history found.";
    if (userId) {
      try {
        pastContext = await getPastPerformanceContext(userId, "Technical Performance History");
      } catch (ragError) {
        console.warn("[RAG Audit] Failed to fetch context:", ragError.message);
      }
    }

    const transcriptText = transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n');
    const prompt = `
      Perform a final technical and behavioral audit of this interview transcript.
      
      USER PAST PERFORMANCE HISTORY (FOR COMPARISON):
      """${pastContext}"""

      CURRENT TRANSCRIPT:
      """${transcriptText}"""
      
      INSTRUCTIONS:
      1. Analyze the technical accuracy, depth, and communication style of the CURRENT transcript.
      2. Compare current performance with the PAST HISTORY provided.
      3. Identify if the user has improved in areas they previously struggled with.
      4. Return ONLY a JSON object with these EXACT field types:
         - technical: A NUMBER (0-100)
         - communication: A NUMBER (0-100)
         - overall: A NUMBER (0-100)
         - solidAreas: An array of strings (strengths)
         - areasToImprove: An array of strings (weaknesses)
         - areasToLearn: An array of strings (topics for further study)
         - feedback: A single string summarizing performance and growth relative to past history (if any).

      Example JSON:
      {
        "technical": 85,
        "communication": 90,
        "overall": 87,
        "solidAreas": ["React Hooks", "Node.js"],
        "areasToImprove": ["System Design"],
        "areasToLearn": ["Redis"],
        "feedback": "The candidate showed strong mastery of frontend fundamentals. Compared to previous sessions where they struggled with CSS, they demonstrated significant improvement in styling logic today."
      }
    `;
    
    const text = await callGeminiDynamic(prompt, 0.5);
    return extractJson(text);
  } catch (error) {
    console.error('CRITICAL AI ERROR (AnalyzePerformance):', error);
    return { 
      technical: 0, 
      communication: 0, 
      overall: 0, 
      feedback: "Audit failed due to an AI processing error. Please try again later.", 
      solidAreas: [], 
      areasToImprove: [], 
      areasToLearn: [] 
    };
  }
};
