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

// Updated helper function to process products and extract images
const processProductsWithImages = (products) => {
  if (!products || !Array.isArray(products)) {
    console.log('❌ No products array provided to processProductsWithImages');
    return [];
  }

  console.log(`🔄 Processing ${products.length} products for images...`);

  return products.map((product, index) => {
    // Log the structure of the incoming product for image-related fields
    console.log(`📦 Product (raw) ${index + 1} (${product.title || 'N/A'}):`, {
      id: product.id,
      title: product.title,
      featuredImage: product.featuredImage, // Log entire featuredImage object
      images: product.images, // Log entire images object/array
      image: product.image, // Log entire image object/string
      // Keep price logging for context
      price: product.price,
      priceRange: product.priceRange
    });

    const processedProduct = { ...product };
    let imageUrl, imageAlt;

    // 1. Try product.featuredImage (common in Shopify Storefront API for primary image)
    if (product.featuredImage && product.featuredImage.url) {
      imageUrl = product.featuredImage.url;
      imageAlt = product.featuredImage.altText || product.title || 'Product Image';
      console.log(`✅ Image found from product.featuredImage for "${product.title}": ${imageUrl}`);
    }
    // 2. Try product.images (array, could be direct objects or GraphQL edges.nodes)
    else if (product.images) {
      if (Array.isArray(product.images) && product.images.length > 0) {
        const firstImage = product.images[0];
        if (firstImage && (firstImage.url || firstImage.src)) {
          imageUrl = firstImage.url || firstImage.src;
          imageAlt = firstImage.altText || firstImage.alt || product.title || 'Product Image';
          console.log(`✅ Image found from product.images[0] for "${product.title}": ${imageUrl}`);
        }
      } else if (product.images.edges && Array.isArray(product.images.edges) && product.images.edges.length > 0) {
        const firstNode = product.images.edges[0].node;
        if (firstNode && firstNode.url) {
          imageUrl = firstNode.url;
          imageAlt = firstNode.altText || product.title || 'Product Image';
          console.log(`✅ Image found from product.images.edges[0].node for "${product.title}": ${imageUrl}`);
        }
      }
    }
    // 3. Try product.image (object with url/src, or direct string URL)
    // This should be checked after product.images as product.image might be a simplified version
    if (!imageUrl && product.image) { // Check only if not already found
      if (typeof product.image === 'object' && product.image !== null && (product.image.url || product.image.src)) {
        imageUrl = product.image.url || product.image.src;
        imageAlt = product.image.altText || product.image.alt || product.title || 'Product Image';
        console.log(`✅ Image found from product.image object for "${product.title}": ${imageUrl}`);
      } else if (typeof product.image === 'string' && product.image.startsWith('http')) {
        imageUrl = product.image;
        imageAlt = product.title || 'Product Image';
        console.log(`✅ Image found from product.image string for "${product.title}": ${imageUrl}`);
      }
    }

    if (imageUrl) {
      processedProduct.image = {
        url: imageUrl,
        alt: imageAlt || product.title || 'Product Image' // Ensure alt text
      };
    } else {
      delete processedProduct.image; // Ensures ProductCard fallback UI is triggered cleanly
      console.log(`❌ No standard image URL found for "${product.title}". Raw data logged above. Fallback UI in ProductCard will be used.`);
    }

    // Ensure price structure is consistent (from original code)
    if (!processedProduct.priceRange && product.price) {
      processedProduct.priceRange = {
        minVariantPrice: {
          amount: product.price
        }
      };
    }
    // Optional: Ensure price amount is a number if it's a string and needs calculation later
    // else if (processedProduct.priceRange?.minVariantPrice?.amount && typeof processedProduct.priceRange.minVariantPrice.amount === 'string') {
    //   const amount = parseFloat(processedProduct.priceRange.minVariantPrice.amount);
    //   if (!isNaN(amount)) {
    //     processedProduct.priceRange.minVariantPrice.amount = amount;
    //   }
    // }

    return processedProduct;
  });
};

// Helper function to create chat images from products
// This function receives products already processed by processProductsWithImages
const createChatImages = (products) => {
  if (!products || !Array.isArray(products)) {
    console.log('❌ No products provided to createChatImages');
    return [];
  }

  const chatImages = products
    .filter(product => {
      // product.image should now be { url: ..., alt: ... } or undefined
      const hasImage = product.image && product.image.url;
      if (!hasImage) {
        console.log(`⚠️ Filtering out "${product.title}" for chatImages - no valid product.image.url after processing`);
      }
      return hasImage;
    })
    .slice(0, 6) // Limit to 6 images to avoid overwhelming the chat
    .map(product => ({
      url: product.image.url, // Safe to access .url due to filter
      alt: product.image.alt || product.title || 'Product',
      title: product.title,
      price: product.priceRange?.minVariantPrice?.amount || product.price
    }));

  console.log(`🖼️ Created ${chatImages.length} chat images from ${products.length} (original) products`);
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
    const agentResponse = await dispatch(translatedMessage, agentIntent);

    console.log('🔍 FULL AGENT RESPONSE:', JSON.stringify(agentResponse, null, 2));

    if (agentResponse.metadata) {
      console.log('📋 Agent Response Metadata:', JSON.stringify(agentResponse.metadata, null, 2));
      // Further detailed logging of raw products from agent if needed
      // if (agentResponse.metadata.products) {
      //   console.log(`📦 Raw products from agent: ${agentResponse.metadata.products.length}`);
      //   agentResponse.metadata.products.forEach((p, i) => console.log(`Raw Product ${i}: ${p.title}`, p.featuredImage, p.images, p.image));
      // }
    }

    // Step 5: Format response
    let response = agentResponse.content;
    let products = []; // This will hold products for ProductCard display
    let cartUpdate = null;
    let chatImages = []; // This will hold images for chat display

    if (agentResponse.metadata?.products) {
      console.log('🔄 Processing products from agent response with new image logic...');
      // Process products from agent to standardize image structure and for ProductCard display
      products = processProductsWithImages(agentResponse.metadata.products);

      // Create chatImages from these *processed* products
      chatImages = createChatImages(products);

      if (products.length > 0) {
        const productCount = products.length;
        const categoryHint = entities.category ? ` in ${entities.category}` : (contextualEntities.category ? ` in ${contextualEntities.category}` : '');
        // Append to existing response content if it's a generic one
        if (response && !response.toLowerCase().includes('found') && !response.toLowerCase().includes('here are')) {
             response += `\n\nI found ${productCount} product${productCount > 1 ? 's' : ''}${categoryHint} that might interest you.`;
        } else if (!response) { // If agent content was empty
            response = `I found ${productCount} product${productCount > 1 ? 's' : ''}${categoryHint} that might interest you.`;
        }
        // If response already mentions products, it might be fine.
      } else if (agentIntent === INTENT_TYPES.PRODUCT && (!response || !response.toLowerCase().includes('no products found'))) {
        // If it was a product intent but nothing found and agent didn't say so
        response = response ? response + "\n\n" : "";
        response += `I couldn't find products matching your exact criteria right now. Try a different search?`;
      }
    }
    
    if (agentResponse.metadata?.cartUpdate) {
      cartUpdate = agentResponse.metadata.cartUpdate;
    }


    console.log(`💬 Generated final response content: "${response}"`);
    console.log(`📦 Products for ProductCard display: ${products.length}`);
    console.log(`🖼️ Images for chat display: ${chatImages.length}`);


    // Translate response back to user's language if needed
    let translatedResponse = response;
    if (detectedLang !== 'en' && response) { // Check if response is not empty
      try {
        translatedResponse = await translation.translateText(response, 'en', detectedLang);
      } catch (translationError) {
        console.error('❌ Response translation error:', translationError);
        translatedResponse = response; // Fallback to English response
      }
    }

    const finalResponse = {
      response: translatedResponse,
      products, // These are for the ProductCard components
      cartUpdate,
      sessionId,
      intent: contextualIntent,
      entities: contextualEntities,
      metadata: { // Metadata for the chat message itself
        ...agentResponse.metadata, // Carry over original metadata
        chatImages: chatImages.length > 0 ? chatImages : undefined, // For rendering images in chat
        hasImages: chatImages.length > 0 // Convenience flag
      }
    };

    console.log('🚀 FINAL API RESPONSE (to be sent to client):', JSON.stringify(finalResponse, (key, value) => (key === 'products' && Array.isArray(value)) ? `[${value.length} products]` : value, 2)); // Keep products array concise in log


    return NextResponse.json(finalResponse);

  } catch (error) {
    console.error('❌ Error in chat API:', error.stack); // Log stack for more details
    return NextResponse.json(
      {
        error: 'An error occurred processing your message',
        response: 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.'
      },
      { status: 500 }
    );
  }
}