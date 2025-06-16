// /api/chat/route.js
import { NextResponse } from 'next/server';

import GeminiClient from '@/lib/gemini';
import ShopifyClient from '@/lib/shopify';
import * as translation from '@/lib/translation';
import { dispatch, INTENT_TYPES } from '@/lib/agents/dispatchAgent';

import { 
  classifyIntentWithLLM as classifyIntent, 
  extractEntitiesWithLLM as extractEntities,
  // ConversationContext // We will rely on messageHistory for now, ConversationContext can be integrated later if needed
} from '@/lib/intent-recognition';

// Initialize clients
const gemini = new GeminiClient(process.env.GEMINI_API_KEY);
const shopify = new ShopifyClient(
  process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN,
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN
);

// const sessions = {}; // Store conversation sessions - We'll manage history primarily via client, but can store server-side if needed.

const INTENT_MAP = {
  search_products: INTENT_TYPES.PRODUCT,
  product_details: INTENT_TYPES.PRODUCT,
  add_to_cart: INTENT_TYPES.PRODUCT,
  checkout: INTENT_TYPES.SUPPORT,
  order_status: INTENT_TYPES.SUPPORT,
  general_inquiry: INTENT_TYPES.FAQ,
};

// Helper function to process products and extract images
const processProductsWithImages = (products) => {
  if (!products || !Array.isArray(products)) {
    console.log('❌ No products array provided to processProductsWithImages');
    return [];
  }
  
  console.log(`🔄 Processing ${products.length} products for images (in API route)...`);
  
  return products.map((product, index) => {
    const processedProduct = { ...product };
    let imageUrl = null;
    let imageAlt = product.title || 'Product Image';

    // Correctly access image URL from Shopify's typical structure
    if (product.images && product.images.edges && product.images.edges.length > 0 && product.images.edges[0].node) {
      imageUrl = product.images.edges[0].node.url;
      imageAlt = product.images.edges[0].node.altText || imageAlt;
      console.log(`✅ [API route] Image found for ${product.title} via product.images.edges:`, imageUrl);
    } else if (product.image && product.image.url) { // Fallback for an already flattened image structure
      imageUrl = product.image.url;
      imageAlt = product.image.alt || imageAlt;
      console.log(`✅ [API route] Image found for ${product.title} via product.image.url:`, imageUrl);
    } else {
      console.log(`❌ [API route] No image found for ${product.title}`);
    }

    if (imageUrl) {
      processedProduct.image = { url: imageUrl, alt: imageAlt };
    }
    
    // Ensure price structure is consistent
    if (!processedProduct.priceRange && product.price) {
      processedProduct.priceRange = {
        minVariantPrice: {
          amount: product.price
        }
      };
    }
    
    return processedProduct;
  });
};

// Helper function to create chat images from products
const createChatImages = (products) => { // products here are the result of processProductsWithImages
  if (!products || !Array.isArray(products)) {
    console.log('❌ No products provided to createChatImages');
    return [];
  }
  
  const chatImages = products
    .filter(product => {
      const hasImage = product.image && product.image.url; // Relies on processProductsWithImages
      if (!hasImage) {
        console.log(`[API route] ⚠️ Filtering out ${product.title} from chatImages - no image.url`);
      }
      return hasImage;
    })
    .slice(0, 6) // Limit to 6 images
    .map(product => ({
      id: product.id, // Pass product ID for chat card clicks
      url: product.image.url,
      alt: product.image.alt || product.title || 'Product',
      title: product.title,
      price: product.priceRange?.minVariantPrice?.amount || product.price,
      description: stripHtml(product.description || product.descriptionHtml || '').substring(0,70) + '...'
    }));
    
  console.log(`🖼️ [API route] Created ${chatImages.length} chat images from ${products.length} products`);
  return chatImages;
};

// Helper function to strip HTML (if not already available globally here)
function stripHtml(html) {
  // Basic stripping, consider a library for robustness if complex HTML is common
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, '');
}

export async function POST(request) {
  try {
    const { message, messageHistory = [], sessionId = 'default' } = await request.json(); // Expect messageHistory from client
    
    console.log(`📨 Received message: "${message}"`);
    console.log(`📜 Received messageHistory length: ${messageHistory.length}`);

    // Detect language and translate incoming message to English if needed
    let translatedMessage = message;
    let detectedLang = 'en';
    try {
      detectedLang = await translation.detectLanguage(message);
      if (detectedLang !== 'en') {
        translatedMessage = await translation.translateText(message, detectedLang, 'en');
        console.log(`🌐 Detected language: ${detectedLang}, translated to English: "${translatedMessage}"`);
      } else {
        console.log('🌐 Message is already in English.');
      }
    } catch (translationError) {
      console.error('❌ Translation error:', translationError);
      translatedMessage = message; // Fallback to original message
    }

    // Get or create conversation context (Simplified session for now)
    // if (!sessions[sessionId]) {
    //   sessions[sessionId] = {
    //     history: [], // Store history here if needed for server-side state
    //     cartId: null
    //   };
    // }
    // const session = sessions[sessionId];
    // let currentConversationHistory = session.history; // Or use messageHistory directly from client

    let currentConversationHistory = messageHistory; // Use history from client

    // Step 1: Classify intent, now with history
    const { intent, confidence } = await classifyIntent(translatedMessage, gemini, currentConversationHistory);
    console.log(`🎯 Classified intent: ${intent} (confidence: ${confidence})`);

    // Map to our agent system intent
    const agentIntent = INTENT_MAP[intent] || INTENT_TYPES.FALLBACK;
    console.log(`🔄 Mapped intent to agent system: ${agentIntent}`);
    
    // Step 2: Extract entities, now with history
    let entities = await extractEntities(translatedMessage, intent, gemini, currentConversationHistory);
    console.log(`📊 Extracted entities:`, JSON.stringify(entities, null, 2));
    
    // Step 3: Contextual understanding (Placeholder for ConversationContext if re-integrated)
    // const { intent: contextualIntent, entities: contextualEntities } = 
    //   session.context.updateContext(translatedMessage, intent, entities);
    // For now, use entities directly, assuming ConversationContext might be enhanced later
    const contextualIntent = INTENT_MAP[intent] || INTENT_TYPES.FALLBACK; // Re-mapping based on raw intent
    const contextualEntities = entities;

    // Prepare history for dispatch: current message + previous history
    const userMessageEntry = { role: 'user', content: translatedMessage };
    const historyForDispatch = [...currentConversationHistory, userMessageEntry];


    // Step 4: Process intent using agent system, now with history
    console.log(`🤖 Dispatching to agent with intent: ${agentIntent}`);
    console.log('Dispatching message:', { content: translatedMessage, type: 'text' });
    const agentResponse = await dispatch({ content: translatedMessage, type: 'text' }, agentIntent, contextualEntities, historyForDispatch);
    
    // 🔍 DETAILED LOGGING OF AGENT RESPONSE
    // console.log('🔍 FULL AGENT RESPONSE:', JSON.stringify(agentResponse, null, 2)); // <--- COMMENT THIS LINE OUT
    
    if (agentResponse.metadata) {
      console.log('📋 Agent Response Metadata:', JSON.stringify(agentResponse.metadata, null, 2));
      
      if (agentResponse.metadata.products) {
        console.log(`📦 Found ${agentResponse.metadata.products.length} products in agent response`); // This is the log that appears after the one you want to remove
        agentResponse.metadata.products.forEach((product, index) => {
          console.log(`Product ${index + 1}:`, {
            id: product.id,
            title: product.title,
            price: product.price,
            priceRange: product.priceRange,
            hasImages: !!(product.images && product.images.length > 0),
            hasImage: !!product.image,
            imageStructure: product.images ? product.images[0] : product.image
          });
        });
      }
    }
    
    // Step 5: Format response
    let response = agentResponse.content;
    let products = [];
    let cartUpdate = null;
    let chatImages = [];

    // Handle special cases for product-related intents
    if (agentIntent === INTENT_TYPES.PRODUCT) {
      if (agentResponse.metadata?.products) {
        console.log('🔄 [API route] Processing products with images for agent response...');
        const tempProcessedProducts = processProductsWithImages(agentResponse.metadata.products);
        products = tempProcessedProducts; // products for the main product grid
        chatImages = createChatImages(tempProcessedProducts); // chatImages for the chat interface
        
        // The 'response' variable (LLM text) should ideally not list products if chatImages will show them.
        // This part is handled by the productAgent's prompt construction.
        // We can still append a generic "I found products" message if the LLM didn't.
        if (products.length > 0 && !response.toLowerCase().includes("check out the product section below")) {
          const productCount = products.length;
          const categoryHint = entities.category ? ` in ${entities.category}` : '';
          response += `\n\nI found ${productCount} product${productCount > 1 ? 's' : ''}${categoryHint} that might interest you. Check out the product section below.`;
        }
      }
      if (agentResponse.metadata?.cartUpdate) {
        cartUpdate = agentResponse.metadata.cartUpdate;
      }
    }

    console.log(`💬 Generated response: "${response}"`);
    console.log(`📦 Found ${products.length} products with ${chatImages.length} images`);

    // 🔍 LOG FINAL PROCESSED PRODUCTS
    console.log('🔍 FINAL PROCESSED PRODUCTS:', JSON.stringify(products, null, 2));
    console.log('🔍 FINAL CHAT IMAGES:', JSON.stringify(chatImages, null, 2));

    // Translate response back to user's language if needed
    let translatedResponse = response;
    if (detectedLang !== 'en') {
      try {
        translatedResponse = await translation.translateText(response, 'en', detectedLang);
      } catch (translationError) {
        console.error('❌ Response translation error:', translationError);
        translatedResponse = response;
      }
    }

    // Append assistant's response to history
    const assistantMessageEntry = { role: 'assistant', content: translatedResponse };
    const updatedHistory = [...historyForDispatch, assistantMessageEntry];

    // Update server-side session history if used
    // session.history = updatedHistory;

    const finalResponse = {
      response: translatedResponse,
      products, // These are the full product details for the product grid
      cartUpdate,
      sessionId,
      intent: contextualIntent, 
      entities: contextualEntities, 
      detectedLang: detectedLang, 
      messageHistory: updatedHistory, 
      metadata: { // This metadata is sent to the client (page.js)
        ...agentResponse.metadata,
        // Ensure products in metadata are the ones processed for the grid if productAgent didn't already process them
        products: products.length > 0 ? products : (agentResponse.metadata.products || []), 
        chatImages: chatImages.length > 0 ? chatImages : undefined,
        hasImages: chatImages.length > 0
      }
    };

    // console.log('🚀 FINAL API RESPONSE:', JSON.stringify(finalResponse, null, 2));

    return NextResponse.json(finalResponse);

  } catch (error) {
    console.error('❌ Error in chat API:', error);
    return NextResponse.json(
      { 
        error: 'An error occurred processing your message',
        response: 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.'
      },
      { status: 500 }
    );
  }
}