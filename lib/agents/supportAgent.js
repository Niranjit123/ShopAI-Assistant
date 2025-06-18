import { ragService } from '../ragService';
import GeminiClient from '../gemini';

const SUPPORT_INDEX_NAME = 'support-rag';
const gemini = new GeminiClient(process.env.GEMINI_API_KEY);

const systemPromptSupport = `You are a helpful customer support assistant.
Your goal is to answer user questions and provide assistance based on the provided support documentation.
Use the retrieved support documents to formulate a clear, concise, and actionable answer.
If the content is not directly relevant or no content is found, politely state that you couldn't find specific information and offer to connect the user to a human agent or provide general support options.
Do not make up answers or procedures if the information is not present in the retrieved content. Stick to the provided information.`;

export const supportAgent = {
  handle: async (query, entities = {}, conversationHistory = []) => {
    try {
      console.log('[SupportAgent] Received query:', query);

      console.log(`[SupportAgent] Querying RAG service with index: ${SUPPORT_INDEX_NAME}...`);
      const ragResponse = await ragService.findMatchingContent(query, SUPPORT_INDEX_NAME, entities, conversationHistory);
      console.log('[SupportAgent] RAG Response:', JSON.stringify(ragResponse, null, 2));

      const retrievedSupportDocs = ragResponse.retrievedContent || [];

      let llmInput = `User's support query: "${query}"\n\n`;
      llmInput += `RAG System Insights: "${ragResponse.ragInsights || 'No specific insights from RAG.'}"\n\n`;

      if (ragResponse.error) {
        console.error('[SupportAgent] RAG service returned an error:', ragResponse.error);
        llmInput += "I encountered an issue trying to retrieve detailed support information. ";
      } else if (retrievedSupportDocs.length > 0) {
        llmInput += "Based on our support documentation, here's some information that might help:\n";
        retrievedSupportDocs.forEach((doc, index) => {
          // Ensure 'doc.text_chunk' (or the correct field name for your support docs) is used
          const content = doc.text_chunk || doc.text || 'Content not available.'; // Prioritize the field with actual content
          llmInput += `\nRelevant Document ${index + 1} (Score: ${doc.score?.toFixed(2)}):\n"${content}"\n`;
        });
        llmInput += "\nFormulate a helpful and actionable response based *only* on the provided documents. If they aren't relevant, state that and offer other support options.";
      } else {
        llmInput += "I couldn't find a specific support document matching your query in our database. ";
      }
      
      llmInput += "\n\nPlease provide a helpful response to the user. If no specific information was found, explain what you can generally help with or how they can get further assistance.";
      
      const currentMessageHistory = [...conversationHistory, {role: 'user', content: query}];
      const combinedPromptForLLM = `${systemPromptSupport}\n\n${llmInput}`;
      
      const finalResponseText = await gemini.generateResponse(combinedPromptForLLM, currentMessageHistory);

      return {
        type: 'support',
        content: finalResponseText,
        metadata: { 
          intent: 'SUPPORT_RESULT', 
          ragInsights: ragResponse.ragInsights,
          retrievedDocsCount: retrievedSupportDocs.length,
          error: ragResponse.error
        }
      };

    } catch (error) {
      console.error('[SupportAgent] Error in handle:', error);
      let userSafeErrorMessage = "Sorry, I encountered an issue while trying to assist with your support query. Please try rephrasing.";
       if (error.message && error.message.includes("gemini")) {
          userSafeErrorMessage = "There was an issue with our AI assistant's ability to generate a response for your support query. Please try again shortly.";
      }
      return {
        type: 'error',
        content: userSafeErrorMessage,
        metadata: { intent: 'ERROR', errorDetails: error.message }
      };
    }
  }
};
