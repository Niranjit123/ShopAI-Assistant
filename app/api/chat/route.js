// /api/chat/route.js
import { NextResponse } from 'next/server';

import GeminiClient from '@/lib/gemini';
import ShopifyClient from '@/lib/shopify';
import TranslatorClient from '@/lib/translator'; // Using NLLB translator now

import { classifyIntent, extractEntities, ConversationContext, INTENTS } from '@/lib/intent-recognition';

// Initialize clients
const gemini = new GeminiClient(process.env.GEMINI_API_KEY);
const shopify = new ShopifyClient(
  process.env.SHOPIFY_STORE_DOMAIN,
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
);
// Updated to use Hugging Face API key
const translator = new TranslatorClient(process.env.HUGGINGFACE_API_KEY);

const sessions = {}; // Store conversation sessions

export async function POST(request) {
  try {
    const { message, messageHistory, sessionId = 'default' } = await request.json();
    
    console.log(`Received message: "${message}"`);
    
    // Translate incoming message to English using automatic language detection
    let translatedMessage;
    try {
      translatedMessage = await translator.translateToEnglish(message);
      console.log(`Translated to English: "${translatedMessage}"`);
    } catch (translationError) {
      console.error('Translation error:', translationError);
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
    const { intent, confidence } = classifyIntent(translatedMessage);
    console.log(`Classified intent: ${intent} (confidence: ${confidence})`);

    // Step 2: Extract entities
    let entities = extractEntities(translatedMessage, intent);

    // Step 3: Apply contextual understanding
    const { intent: contextualIntent, entities: contextualEntities } = 
      session.context.updateContext(translatedMessage, intent, entities);

    // Step 4: Process intent
    let response = '';
    let products = [];
    let cartUpdate = null;

    switch (contextualIntent) {
      case INTENTS.SEARCH_PRODUCTS:
        if (!session.cartId) {
          const cart = await shopify.createCart();
          session.cartId = cart.id;
          session.context.setCartId(cart.id);
        }
        
        const searchTerms = contextualEntities.search_terms?.length > 0 
          ? contextualEntities.search_terms 
          : [translatedMessage];
        
        products = await shopify.searchProducts(searchTerms, contextualEntities.filters);
        
        session.context.setCurrentProducts(products);

        const searchContext = `
          The user is searching for products with these terms: ${searchTerms.join(', ')}.
          I found ${products.length} products.
          ${products.length > 0 ? 'Here are some of the product titles: ' + 
            products.slice(0, 3).map(p => p.title).join(', ') + '...' : 'No products were found.'}
        `;

        response = await gemini.generateResponse(
          `You are a helpful e-commerce assistant. ${searchContext}
           Respond to this customer search: "${translatedMessage}"
           Be concise and friendly. Don't list all the products, just mention that you found some options.`,
          messageHistory
        );
        break;

      case INTENTS.PRODUCT_DETAILS:
        let productToDescribe = null;
        
        if (contextualEntities.product_id) {
          productToDescribe = await shopify.getProductDetails(contextualEntities.product_id);
        } else if (session.context.current_products?.length > 0) {
          const lowerMessage = translatedMessage.toLowerCase();
          productToDescribe = session.context.current_products.find(p => 
            lowerMessage.includes(p.title.toLowerCase())
          );
          
          if (productToDescribe) {
            session.context.setCurrentProduct(productToDescribe.id);
          }
        }
        
        if (productToDescribe) {
          const productContext = `
            Product Name: ${productToDescribe.title}
            Price: ${productToDescribe.priceRange.minVariantPrice.amount} ${productToDescribe.priceRange.minVariantPrice.currencyCode}
            Description: ${productToDescribe.description}
            
            It has ${productToDescribe.variants.length} variants available.
          `;

          response = await gemini.generateResponse(
            `You are a helpful e-commerce assistant. ${productContext}
             Respond to this customer asking about the product: "${translatedMessage}"
             Be enthusiastic but honest about the product. Mention key details like price and features.`,
            messageHistory
          );
        } else {
          response = await gemini.generateResponse(
            `You are a helpful e-commerce assistant. The customer is asking about a product, 
             but I'm not sure which one they're referring to. Ask them for clarification.
             Customer query: "${translatedMessage}"`,
            messageHistory
          );
        }
        break;

      case INTENTS.ADD_TO_CART:
        if (contextualEntities.product_id && session.cartId) {
          try {
            const product = session.context.current_products.find(
              p => p.id === contextualEntities.product_id
            );
            
            if (product) {
              const variantId = contextualEntities.variant_id || product.variants[0].id;
              const quantity = contextualEntities.quantity || 1;

              const updatedCart = await shopify.addToCart(
                session.cartId, 
                variantId, 
                quantity
              );

              const cartItems = updatedCart.lines.edges.map(edge => {
                const item = edge.node;
                const merchandise = item.merchandise;

                return {
                  id: item.id,
                  title: merchandise.product.title,
                  variant: merchandise.title,
                  price: merchandise.price.amount,
                  quantity: item.quantity
                };
              });

              cartUpdate = {
                cart: cartItems,
                total: updatedCart.cost.totalAmount.amount
              };

              response = await gemini.generateResponse(
                `You are a helpful e-commerce assistant. I've added ${product.title} to the customer's cart.
                 The cart now has ${cartItems.length} items with a total of ${updatedCart.cost.totalAmount.amount} ${updatedCart.cost.totalAmount.currencyCode}.
                 Respond to the customer's request: "${translatedMessage}"
                 Be enthusiastic and brief. Confirm the item was added and ask if they want to continue shopping or checkout.`,
                messageHistory
              );
            } else {
              response = "I'm not sure which product you want to add to your cart. Could you specify which item you're interested in?";
            }
          } catch (error) {
            console.error('Error adding to cart:', error);
            response = "I'm sorry, I couldn't add that item to your cart. Please try again.";
          }
        } else if (!session.cartId) {
          const cart = await shopify.createCart();
          session.cartId = cart.id;
          session.context.setCartId(cart.id);

          response = "I've created a shopping cart for you. Could you specify which product you'd like to add?";
        } else {
          response = "I'm not sure which product you want to add to your cart. Could you specify which item you're interested in?";
        }
        break;

      case INTENTS.CHECKOUT:
        if (session.cartId) {
          const cart = await shopify.getCart(session.cartId);

          if (cart && cart.lines.edges.length > 0) {
            response = `Great! You're ready to checkout. Here's the checkout link: ${cart.checkoutUrl}`;
          } else {
            response = "Your cart is empty. Would you like to browse some products first?";
          }
        } else {
          response = "You don't have an active cart yet. Let's find some products for you first.";
        }
        break;

      case INTENTS.ORDER_STATUS:
        response = await gemini.generateResponse(
          `You are a helpful e-commerce assistant. The customer is asking about order status: "${translatedMessage}"
           Explain that they would need to provide an order number, and that you can check the status for them.
           For this demo version, explain that order tracking isn't fully implemented yet.`,
          messageHistory
        );
        break;

      default:
        if (!session.cartId) {
          const cart = await shopify.createCart();
          session.cartId = cart.id;
          session.context.setCartId(cart.id);
        }

        response = await gemini.generateResponse(
          `You are a helpful e-commerce assistant for an online store.
           Respond to this customer message: "${translatedMessage}"
           Be friendly and concise. If appropriate, suggest that they can ask about products, 
           add items to cart, or check their cart.`,
          messageHistory
        );
    }

    console.log(`Generated response: "${response}"`);

    // Translate Gemini's English response back to the original language
    let translatedResponse;
    try {
      translatedResponse = await translator.translateToManipuri(response);
      console.log(`Translated response: "${translatedResponse}"`);
    } catch (translationError) {
      console.error('Response translation error:', translationError);
      translatedResponse = response; // Fallback to English response
    }

    return NextResponse.json({ 
      message: translatedResponse,
      products, 
      cartUpdate,
      intent: contextualIntent
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your message' },
      { status: 500 }
    );
  }
}