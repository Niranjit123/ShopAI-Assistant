import ShopifyClient from '../shopify';
import { ragService } from '../ragService'; // Import the actual RAG service
import GeminiClient from '../gemini';

const shopify = new ShopifyClient(
  process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN,
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN
);

// Initialize Gemini client for response synthesis
const gemini = new GeminiClient(process.env.GEMINI_API_KEY);

// Define a basic system prompt for the product agent's LLM
const systemPrompt = `You are a friendly and helpful e-commerce shopping assistant. 
Your goal is to help users find products they are looking for.
Be conversational and provide clear, concise information.
When presenting products, mention their names and prices.
If products are not available, inform the user politely and offer to help find alternatives.`;

export const productAgent = {
  handle: async (message, entities = {}, conversationHistory = []) => {
    try {
      console.log('[ProductAgentV2] Received message:', message);
      console.log('[ProductAgentV2] Received entities:', JSON.stringify(entities, null, 2));

      if (!message || typeof message !== 'string') {
        return {
          type: 'error',
          content: 'Invalid message received by product agent.',
          metadata: { intent: 'ERROR' }
        };
      }

      // 1. Query RAG service to understand query and find candidate products
      console.log('[ProductAgentV2] Querying RAG service...');
      const ragResponse = await ragService.findMatchingProducts(message, entities, conversationHistory);
      
      console.log('[ProductAgentV2] RAG Response:', JSON.stringify(ragResponse, null, 2));

      if (ragResponse.error || !ragResponse.candidateProductIds || ragResponse.candidateProductIds.length === 0) {
        let noProductsContent = ragResponse.ragInsights || "I couldn't find specific products matching your description right now.";
        // Fallback to a more general LLM response if RAG finds nothing or errors out
        const fallbackPrompt = `User asked: "${message}". My product search system provided the following context/issue: "${noProductsContent}". Offer a helpful, general response or ask clarifying questions. If there was an issue, don't mention it directly to the user, just try to be helpful otherwise.`;
        
        const fallbackText = await gemini.generateResponse(fallbackPrompt, conversationHistory); 
        return {
          type: 'product', // Or 'info'
          content: fallbackText,
          metadata: { intent: 'PRODUCT_INFO_FALLBACK', products: [], ragInsights: ragResponse?.ragInsights, error: ragResponse?.error }
        };
      }

      // 2. Fetch product details and availability from Shopify for RAG candidates
      console.log(`[ProductAgentV2] Fetching details for ${ragResponse.candidateProductIds.length} product IDs from Shopify...`);
      // Ensure shopify.js has getProductsDetailsByIds that returns products with availability
      const productsFromShopify = await shopify.getProductsDetailsByIds(ragResponse.candidateProductIds);
      
      console.log(`[ProductAgentV2] Received ${productsFromShopify.length} products from Shopify.`);

      const availableProducts = productsFromShopify.filter(p => p && p.availableForSale);
      console.log(`[ProductAgentV2] Found ${availableProducts.length} available products.`);

      // 3. Synthesize the final response using an LLM
      let llmInput = `User's original query: "${message}"\n`;
      llmInput += `My understanding and RAG insights: "${ragResponse.ragInsights || 'Found some potential matches.'}"\n\n`;

      if (availableProducts.length > 0) {
        llmInput += "Based on that, here are some available products you might like:\n";
        availableProducts.forEach(p => {
          const price = p.priceRange?.minVariantPrice?.amount || p.price || 'N/A';
          const currency = p.priceRange?.minVariantPrice?.currencyCode || '';
          llmInput += `- ${p.title} (Price: ${price} ${currency}).\n`; // Weave in RAG insights per product if possible
        });
      } else if (productsFromShopify.length > 0) { // RAG found products, but none are available
        llmInput += "I found some products that match your description, but unfortunately, they seem to be out of stock right now. ";
        llmInput += "These included: " + productsFromShopify.map(p=>p.title).join(', ') + ". ";
        llmInput += "Would you like me to help you find something similar that is available, or perhaps I can check again later?";
      } else { // RAG found IDs, but Shopify returned nothing for them (or RAG IDs were empty but no error)
        llmInput += "I had some ideas based on your request, but I couldn't fetch their current details or availability. ";
        llmInput += "Perhaps I can offer some general advice based on what you're looking for? " + (ragResponse.ragInsights || "");
      }
      
      llmInput += "\n\nFormulate a helpful and natural response to the user.";
      
      const currentMessageHistory = [...conversationHistory, {role: 'user', content: message}];
      const combinedPromptForLLM = `${systemPrompt}\n\n${llmInput}`;
      
      const finalResponseText = await gemini.generateResponse(combinedPromptForLLM, currentMessageHistory);

      return {
        type: 'product',
        content: finalResponseText,
        metadata: {
          intent: 'PRODUCT_SEARCH_RESULTS',
          searchCriteria: message,
          ragInsights: ragResponse.ragInsights,
          numResults: availableProducts.length,
          products: availableProducts, // Send available products to the frontend
        }
      };

    } catch (error) {
      console.error('[ProductAgentV2] Error in handle:', error);
      // Fallback response in case of unexpected errors
      let userSafeErrorMessage = "Sorry, I encountered an issue while searching for products. Please try rephrasing.";
      if (error.message && error.message.includes("gemini")) { // Be careful not to expose too much
          userSafeErrorMessage = "There was an issue with our AI assistant's ability to generate a response. Please try again shortly.";
      }

      return {
        type: 'error',
        content: userSafeErrorMessage,
        metadata: { intent: 'ERROR', errorDetails: error.message } // For server-side logging
      };
    }
  }
};
