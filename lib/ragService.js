// lib/ragService.js

import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// --- Initialization ---
let pinecone;
let openai;

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT;
// const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'products'; // Default will be passed by caller

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002';

async function initPineconeClient() { // Renamed to clarify it initializes the main client
  if (pinecone) return;
  if (!PINECONE_API_KEY || !PINECONE_ENVIRONMENT) {
    console.error('[RagService] Pinecone API Key or Environment not configured.');
    throw new Error('Pinecone API Key or Environment not configured.');
  }
  try {
    pinecone = new Pinecone({
      apiKey: PINECONE_API_KEY,
    });
    console.log('[RagService] Pinecone client initialized.');
  } catch (err) {
    console.error("[RagService] Failed to initialize Pinecone client:", err);
    pinecone = null;
    throw err;
  }
}

async function getPineconeIndex(indexName) {
  if (!pinecone) await initPineconeClient();
  if (!pinecone) throw new Error("Pinecone client not initialized.");

  try {
    console.log(`[RagService] Accessing Pinecone index: ${indexName}`);
    const index = pinecone.Index(indexName);
    // You might want to add a light check here, e.g., describeIndexStats, if needed
    // await index.describeIndexStats(); 
    console.log(`[RagService] Successfully accessed Pinecone index: ${indexName}`);
    return index;
  } catch (error) {
    console.error(`[RagService] Error accessing Pinecone index ${indexName}:`, error);
    throw error;
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

async function getQueryEmbedding(queryText) {
  if (!openai) await initOpenAI();
  if (!openai) throw new Error("OpenAI client not initialized.");

  try {
    const response = await openai.embeddings.create({
      model: OPENAI_EMBEDDING_MODEL,
      input: queryText,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('[RagService] Error getting query embedding:', error);
    throw error;
  }
}

async function queryPinecone(indexInstance, vector, topK = 5) { // Takes an initialized index instance
  if (!indexInstance) throw new Error("Pinecone index instance not provided for query.");

  try {
    const queryResponse = await indexInstance.query({
      topK: topK,
      vector: vector,
      includeMetadata: true, 
      includeValues: false // Typically not needed if metadata contains the text
    });

    if (queryResponse && queryResponse.matches) {
      return queryResponse.matches.map(match => ({
        id: match.metadata?.id || match.id, // Prefer 'id' from metadata
        score: match.score,
        text: match.metadata?.text || '', // Expect 'text' in metadata for content
        ...match.metadata // Include all metadata
      }));
    }
    return [];
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    throw error;
  }
}

export const ragService = {
  // Renamed to be more generic, added indexName parameter
  findMatchingContent: async (message, indexName, entities = {}, conversationHistory = []) => {
    console.log(`[RagService] findMatchingContent called for index '${indexName}' with message:`, message);
    try {
      await initOpenAI(); // Ensure OpenAI is ready
      const pineconeIndexInstance = await getPineconeIndex(indexName); // Get specific index instance

      const queryText = message; 
      const queryVector = await getQueryEmbedding(queryText);
      const retrievedItems = await queryPinecone(pineconeIndexInstance, queryVector, 5);

      let ragInsights = `Based on your query, I've searched our '${indexName}' knowledge base.`;
      if (retrievedItems.length > 0 && retrievedItems[0].score) {
        ragInsights += ` The top results have a relevance score of around ${retrievedItems[0].score.toFixed(2)}.`;
      } else if (retrievedItems.length > 0) {
        ragInsights += ` I found ${retrievedItems.length} potential matches.`;
      } else {
        ragInsights = `I searched the '${indexName}' knowledge base but couldn't find specific matches for your query.`;
      }

      console.log(`[RagService] Found ${retrievedItems.length} items from index '${indexName}'.`);
      return {
        retrievedContent: retrievedItems, // Generic field for retrieved documents/items
        ragInsights,
      };

    } catch (error) {
      console.error(`Error in ragService.findMatchingContent (index: ${indexName}):`, error.message);
      return {
        retrievedContent: [],
        ragInsights: `Sorry, I encountered an issue while trying to retrieve information from the '${indexName}' knowledge base. Could you try rephrasing?`,
        error: error.message
      };
    }
  }
};
