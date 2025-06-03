// /api/chat/route.js
import { NextResponse } from 'next/server';

import GeminiClient from '@/lib/gemini';
import ShopifyClient from '@/lib/shopify';
import * as translation from '@/lib/translation';
import { dispatch, INTENT_TYPES } from '@/lib/agents/dispatchAgent';

import { 
  classifyIntentWithLLM as classifyIntent, 
  extractEntitiesWithLLM as extractEntities,
  ConversationContext 
} from '@/lib/intent-recognition';

// Initialize clients
const gemini = new GeminiClient(process.env.GEMINI_API_KEY);
const shopify = new ShopifyClient(
  process.env.SHOPIFY_STORE_DOMAIN,
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
);

const sessions = {}; // Store conversation sessions

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
  
  console.log(`🔄 Processing ${products.length} products for images...`);
  
  return products.map((product, index) => {
    console.log(`📦 Processing product ${index + 1}:`, {
      id: product.id,
      title: product.title,
      hasImages: !!(product.images && product.images.length > 0),
      hasImage: !!product.image,
      imageCount: product.images ? product.images.length : 0
    });
    
    const processedProduct = { ...product };
    
    // Ensure image structure is consistent
    if (product.images && product.images.length > 0) {
      const imageUrl = product.images[0].url || product.images[0].src;
      processedProduct.image = {
        url: imageUrl,
        alt: product.title || 'Product Image'
      };
      console.log(`✅ Image found for ${product.title}:`, imageUrl);
    } else if (product.image) {
      // Handle single image case
      const imageUrl = product.image.url || product.image.src || product.image;
      processedProduct.image = {
        url: imageUrl,
        alt: product.title || 'Product Image'
      };
      console.log(`✅ Single image found for ${product.title}:`, imageUrl);
    } else {
      console.log(`❌ No image found for ${product.title}`);
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
const createChatImages = (products) => {
  if (!products || !Array.isArray(products)) {
    console.log('❌ No products provided to createChatImages');
    return [];
  }
  
  const chatImages = products
    .filter(product => {
      const hasImage = product.image && product.image.url;
      if (!hasImage) {
        console.log(`⚠️ Filtering out ${product.title} - no image URL`);
      }
      return hasImage;
    })
    .slice(0, 6) // Limit to 6 images to avoid overwhelming the chat
    .map(product => ({
      url: product.image.url,
      alt: product.title || 'Product',
      title: product.title,
      price: product.priceRange?.minVariantPrice?.amount || product.price
    }));
    
  console.log(`🖼️ Created ${chatImages.length} chat images from ${products.length} products`);
  return chatImages;
};

export async function POST(request) {
  try {
    const { message, messageHistory, sessionId = 'default' } = await request.json();
    
    console.log(`📨 Received message: "${message}"`);

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

    // Get or create conversation context
    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        context: new ConversationContext(),
        cartId: null
      };
    }
    
    const session = sessions[sessionId];

    // Step 1: Classify intent
    const { intent, confidence } = await classifyIntent(translatedMessage, gemini);
    console.log(`🎯 Classified intent: ${intent} (confidence: ${confidence})`);

    // Map to our agent system intent
    const agentIntent = INTENT_MAP[intent] || INTENT_TYPES.FALLBACK;
    console.log(`🔄 Mapped intent to agent system: ${agentIntent}`);
    
    // Step 2: Extract entities
    let entities = await extractEntities(translatedMessage, intent, gemini);
    console.log(`📊 Extracted entities:`, JSON.stringify(entities, null, 2));
    
    // Step 3: Apply contextual understanding
    const { intent: contextualIntent, entities: contextualEntities } = 
      session.context.updateContext(translatedMessage, intent, entities);

    // Step 4: Process intent using agent system
    console.log(`🤖 Dispatching to agent with intent: ${agentIntent}`);
    const agentResponse = await dispatch(translatedMessage, agentIntent, contextualEntities);
    
    // 🔍 DETAILED LOGGING OF AGENT RESPONSE
    console.log('🔍 FULL AGENT RESPONSE:', JSON.stringify(agentResponse, null, 2));
    
    if (agentResponse.metadata) {
      console.log('📋 Agent Response Metadata:', JSON.stringify(agentResponse.metadata, null, 2));
      
      if (agentResponse.metadata.products) {
        console.log(`📦 Found ${agentResponse.metadata.products.length} products in agent response`);
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
        console.log('🔄 Processing products with images...');
        products = processProductsWithImages(agentResponse.metadata.products);
        chatImages = createChatImages(products);
        
        // Don't append product information to the chat message
        // Instead, just mention that products were found without listing them
        if (products.length > 0) {
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

    const finalResponse = {
      response: translatedResponse,
      products,
      cartUpdate,
      sessionId,
      intent: contextualIntent,
      entities: contextualEntities,
      metadata: {
        ...agentResponse.metadata,
        chatImages: chatImages.length > 0 ? chatImages : undefined,
        hasImages: chatImages.length > 0
      }
    };

    console.log('🚀 FINAL API RESPONSE:', JSON.stringify(finalResponse, null, 2));

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