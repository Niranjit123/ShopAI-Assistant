import { ragService } from '../ragService';
import GeminiClient from '../gemini';

const FAQ_INDEX_NAME = 'faq-rag';
const gemini = new GeminiClient(process.env.GEMINI_API_KEY);

const systemPromptFAQ = `You are a helpful FAQ assistant. 
Your goal is to answer user questions based on the provided FAQ content.
Use the retrieved FAQ documents to formulate a clear and concise answer.
If the retrieved content is not directly relevant or no content is found, politely state that you couldn't find a specific answer and ask if the user needs help with something else.
Do not make up answers if the information is not present in the retrieved content. Stick to the provided information.`;

export const faqAgent = {
  handle: async (query, entities = {}, conversationHistory = []) => {
    try {
      console.log('[FaqAgent] Received query:', query);

      console.log(`[FaqAgent] Querying RAG service with index: ${FAQ_INDEX_NAME}...`);
      const ragResponse = await ragService.findMatchingContent(query, FAQ_INDEX_NAME, entities, conversationHistory);
      console.log('[FaqAgent] RAG Response:', JSON.stringify(ragResponse, null, 2));

      const retrievedFaqs = ragResponse.retrievedContent || [];

      let llmInput = `User's question: "${query}"\n\n`;
      llmInput += `RAG System Insights: "${ragResponse.ragInsights || 'No specific insights from RAG.'}"\n\n`;

      if (ragResponse.error) {
        console.error('[FaqAgent] RAG service returned an error:', ragResponse.error);
        llmInput += "I encountered an issue trying to retrieve detailed FAQ information. ";
      } else if (retrievedFaqs.length > 0) {
        llmInput += "Based on our FAQ database, here's some information that might be relevant:\n";
        retrievedFaqs.forEach((faq, index) => {
          // Use faq.text_chunk instead of faq.text
          const content = faq.text_chunk || faq.text || 'Content not available.'; // Prioritize text_chunk
          llmInput += `\nRelevant Document ${index + 1} (Score: ${faq.score?.toFixed(2)}):\n"${content}"\n`;
        });
        llmInput += "\nFormulate a helpful answer based *only* on the provided documents. If they aren't relevant, state that clearly.";
      } else {
        llmInput += "I couldn't find a specific FAQ document matching your question in our database. ";
      }
      
      llmInput += "\n\nPlease provide a concise and helpful answer to the user's question. If no relevant information was found, state that clearly and politely.";

      const currentMessageHistory = [...conversationHistory, {role: 'user', content: query}];
      const combinedPromptForLLM = `${systemPromptFAQ}\n\n${llmInput}`;
      
      const finalResponseText = await gemini.generateResponse(combinedPromptForLLM, currentMessageHistory);

      return {
        type: 'faq',
        content: finalResponseText,
        metadata: { 
          intent: 'FAQ_RESULT', 
          ragInsights: ragResponse.ragInsights,
          retrievedDocsCount: retrievedFaqs.length,
          error: ragResponse.error 
        }
      };

    } catch (error) {
      console.error('[FaqAgent] Error in handle:', error);
      let userSafeErrorMessage = "Sorry, I encountered an issue while trying to answer your FAQ. Please try rephrasing.";
      if (error.message && error.message.includes("gemini")) {
          userSafeErrorMessage = "There was an issue with our AI assistant's ability to generate a response for your FAQ. Please try again shortly.";
      }
      return {
        type: 'error',
        content: userSafeErrorMessage,
        metadata: { intent: 'ERROR', errorDetails: error.message }
      };
    }
  }
};
