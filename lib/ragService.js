// lib/ragService.js

import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// --- Initialization ---
let pinecone;
let openai;
let pineconeIndex;

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT; // e.g., 'gcp-starter' or your specific environment
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'products'; // Your Pinecone index name

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002'; // Or your preferred OpenAI model

async function initPinecone() {
  if (pinecone) return;
  if (!PINECONE_API_KEY || !PINECONE_ENVIRONMENT) {
    console.error('[RagService] Pinecone API Key or Environment not configured.');
    throw new Error('Pinecone API Key or Environment not configured.');
  }
  try {
    pinecone = new Pinecone({
      apiKey: PINECONE_API_KEY,
    });
    // The environment value might not be directly used in the constructor for v3.x of the client.
    // Connection to an index implies the environment.
    pineconeIndex = pinecone.index(PINECONE_INDEX_NAME);
    console.log(`[RagService] Pinecone client initialized and connected to index: ${PINECONE_INDEX_NAME}.`);
  } catch (err) {
    console.error("[RagService] Failed to initialize Pinecone client:", err);
    pinecone = null;
    pineconeIndex = null;
    throw err;
  }
}

async function initOpenAI() {
  if (openai) return;
  if (!OPENAI_API_KEY) {
    console.error('[RagService] OpenAI API Key not configured.');
    throw new Error('OpenAI API Key not configured.');
  }
  try {
    openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
    console.log('[RagService] OpenAI client initialized.');
  } catch (err) {
    console.error("[RagService] Failed to initialize OpenAI client:", err);
    openai = null;
    throw err;
  }
}

// Call initialization functions - in a real app, you might do this more robustly
// (e.g., on server start or lazily on first call with proper error handling).
// For Next.js, these might be initialized once and reused.
// Consider a singleton pattern or initializing in a global setup file.

async function getQueryEmbedding(queryText) {
  if (!openai) await initOpenAI();
  if (!openai) throw new Error("OpenAI client not initialized.");

  try {
    const response = await openai.embeddings.create({
      model: OPENAI_EMBEDDING_MODEL,
      input: queryText,
    });
    if (response.data && response.data.length > 0 && response.data[0].embedding) {
      return response.data[0].embedding;
    }
    throw new Error('Failed to get embeddings from OpenAI.');
  } catch (error) {
    console.error('Error getting query embedding from OpenAI:', error);
    throw error;
  }
}

async function queryPineconeForProducts(vector, topK = 5) {
  if (!pineconeIndex) await initPinecone(); // Ensures index is ready
  if (!pineconeIndex) throw new Error("Pinecone index not initialized.");

  try {
    const queryResponse = await pineconeIndex.query({
      topK: topK,
      vector: vector,
      includeMetadata: true, // Assuming you store shopifyGid in metadata
    });

    if (queryResponse && queryResponse.matches) {
      return queryResponse.matches.map(match => ({
        id: match.metadata?.shopifyGid || match.id, // Prefer shopifyGid from metadata
        score: match.score,
        // You can add other metadata fields here if you store them
      }));
    }
    return [];
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    throw error;
  }
}

export const ragService = {
  findMatchingProducts: async (message, entities = {}, conversationHistory = []) => {
    console.log('[RagService-Pinecone] findMatchingProducts called with message:', message);
    try {
      await initOpenAI(); // Ensure OpenAI is ready
      await initPinecone(); // Ensure Pinecone is ready

      const queryText = message; // Potentially refine queryText using entities and history
      const queryVector = await getQueryEmbedding(queryText);
      const retrievedProducts = await queryPineconeForProducts(queryVector, 5); // Get top 5 matches

      const candidateProductIds = retrievedProducts.map(p => p.id);

      let ragInsights = "Based on your query, I've found some products that seem to be a good match from our catalog.";
      if (retrievedProducts.length > 0 && retrievedProducts[0].score) {
        ragInsights += ` The top results have a relevance score of around ${retrievedProducts[0].score.toFixed(2)}.`;
      } else if (retrievedProducts.length > 0) {
        ragInsights += ` I found ${retrievedProducts.length} potential matches.`;
      }

      console.log('[RagService-Pinecone] Found candidateProductIds:', candidateProductIds);
      return {
        candidateProductIds,
        ragInsights,
        retrievedProductsInfo: retrievedProducts // For debugging or more advanced logic
      };

    } catch (error) {
      console.error('Error in ragService.findMatchingProducts (Pinecone):', error.message);
      return {
        candidateProductIds: [],
        ragInsights: "Sorry, I encountered an issue while trying to understand your request with our advanced search. Could you try rephrasing?",
        error: error.message
      };
    }
  }
};
