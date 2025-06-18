import ShopifyClient from '../shopify';
import { ragService } from '../ragService'; 
import GeminiClient from '../gemini';

const shopify = new ShopifyClient(
  process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN,
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN
);
const gemini = new GeminiClient(process.env.GEMINI_API_KEY);

const systemPrompt = `You are a friendly and helpful e-commerce shopping assistant. 
Your goal is to help users find products they are looking for.
Be conversational and provide clear, concise information.
When presenting products, mention their names and prices.
If products are not available, inform the user politely and offer to help find alternatives.`;

const PRODUCT_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'products'; // Define product index name

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

      console.log('[ProductAgentV2] Querying RAG service for products...');
      // Use the new findMatchingContent method with the specific product index name
      const ragResponse = await ragService.findMatchingContent(message, PRODUCT_INDEX_NAME, entities, conversationHistory);
      
      console.log('[ProductAgentV2] RAG Response:', JSON.stringify(ragResponse, null, 2));

      // Adapt to the new ragResponse structure: retrievedContent and ragInsights
      const candidateProductDetails = ragResponse.retrievedContent || [];
      // Assuming 'id' or 'shopifyGid' in metadata can be used as product ID
      const candidateProductIds = candidateProductDetails.map(p => p.id || p.shopifyGid).filter(id => id); 

      if (ragResponse.error || !candidateProductIds || candidateProductIds.length === 0) {
        let noProductsContent = ragResponse.ragInsights || "I couldn't find specific products matching your description right now.";
        const fallbackPrompt = `User asked: "${message}". My product search system provided the following context/issue: "${noProductsContent}". Offer a helpful, general response or ask clarifying questions. If there was an issue, don't mention it directly to the user, just try to be helpful otherwise.`;
        
        const fallbackText = await gemini.generateResponse(fallbackPrompt, conversationHistory); 
        return {
          type: 'product',
          content: fallbackText,
          metadata: { intent: 'PRODUCT_INFO_FALLBACK', products: [], ragInsights: ragResponse?.ragInsights, error: ragResponse?.error }
        };
      }

      console.log(`[ProductAgentV2] Fetching details for ${candidateProductIds.length} product IDs from Shopify...`);
      const productsFromShopify = await shopify.getProductsDetailsByIds(candidateProductIds);
      console.log(`[ProductAgentV2] Received ${productsFromShopify.length} products from Shopify.`);

      const availableProducts = productsFromShopify.filter(p => p && p.availableForSale);
      console.log(`[ProductAgentV2] Found ${availableProducts.length} available products.`);

      let llmInput = `User's original query: "${message}"\n`;
      llmInput += `My understanding and RAG insights: "${ragResponse.ragInsights || 'Found some potential matches.'}"\n\n`;

      if (availableProducts.length > 0) {
        llmInput += "Based on that, here are some available products you might like:\n";
        availableProducts.forEach(p => {
          const price = p.priceRange?.minVariantPrice?.amount || p.price || 'N/A';
          const currency = p.priceRange?.minVariantPrice?.currencyCode || '';
          llmInput += `- ${p.title} (Price: ${price} ${currency}).\n`;
        });
      } else if (productsFromShopify.length > 0) {
        llmInput += "I found some products that match your description, but unfortunately, they seem to be out of stock right now. ";
        llmInput += "These included: " + productsFromShopify.map(p=>p.title).join(', ') + ". ";
        llmInput += "Would you like me to help you find something similar that is available, or perhaps I can check again later?";
      } else { 
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
          products: availableProducts, 
        }
      };

    } catch (error) {
      console.error('[ProductAgentV2] Error in handle:', error);
      let userSafeErrorMessage = "Sorry, I encountered an issue while searching for products. Please try rephrasing.";
      if (error.message && error.message.includes("gemini")) { 
          userSafeErrorMessage = "There was an issue with our AI assistant's ability to generate a response. Please try again shortly.";
      }
      return {
        type: 'error',
        content: userSafeErrorMessage,
        metadata: { intent: 'ERROR', errorDetails: error.message } 
      };
    }
  }
};
