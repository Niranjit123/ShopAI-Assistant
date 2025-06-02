// lib/intent-recognition.js

export const INTENTS = {
  SEARCH_PRODUCTS: 'search_products',
  PRODUCT_DETAILS: 'product_details',
  ADD_TO_CART: 'add_to_cart',
  CHECKOUT: 'checkout',
  ORDER_STATUS: 'order_status',
  GENERAL_INQUIRY: 'general_inquiry'
};

/**
 * Classifies intent using Gemini LLM.
 */
export async function classifyIntentWithLLM(message, geminiClient) {
  if (!geminiClient || typeof geminiClient.generateResponse !== 'function') {
    throw new Error('Invalid Gemini client provided');
  }

  const prompt = `
    Analyze the following message and determine its intent from the list below:

    Intents:
    - ${INTENTS.SEARCH_PRODUCTS}: When user wants to search for products.
    - ${INTENTS.PRODUCT_DETAILS}: When user asks about a specific product.
    - ${INTENTS.ADD_TO_CART}: When user wants to add items to their cart.
    - ${INTENTS.CHECKOUT}: When user wants to checkout or complete purchase.
    - ${INTENTS.ORDER_STATUS}: When user inquires about order tracking/status.
    - ${INTENTS.GENERAL_INQUIRY}: All other messages not related to above.

    Return only one intent name as the response. No extra text.

    Message: "${message}"
  `;

  try {
    const response = await geminiClient.generateResponse(prompt);
    const classifiedIntent = response.trim();

    // Validate against known intents
    if (Object.values(INTENTS).includes(classifiedIntent)) {
      return { intent: classifiedIntent, confidence: 0.95 };
    } else {
      console.warn("Unknown intent returned by LLM:", classifiedIntent);
      return { intent: INTENTS.GENERAL_INQUIRY, confidence: 0.8 };
    }
  } catch (error) {
    console.error("Error classifying intent with LLM:", error);
    return { intent: INTENTS.GENERAL_INQUIRY, confidence: 0.7 };
  }
}

/**
 * Extracts entities using Gemini based on the detected intent.
 */
export async function extractEntitiesWithLLM(message, intent, geminiClient) {
  if (!geminiClient || typeof geminiClient.processWithStructuredOutput !== 'function') {
    throw new Error('Invalid Gemini client provided');
  }

  let schema = {};

  switch (intent) {
    case INTENTS.SEARCH_PRODUCTS:
      schema = {
        search_terms: ["string"],
        filters: {
          color: ["string"],
          size: ["string"],
          price_range: "object",
          category: "string"
        }
      };
      break;
    case INTENTS.ADD_TO_CART:
      schema = {
        merchandise_id: "string",
        quantity: "number"
      };
      break;
    case INTENTS.PRODUCT_DETAILS:
      schema = {
        product_id: "string"
      };
      break;
    default:
      return {};
  }

  const prompt = `
    Based on the following message and intent, extract relevant entities in JSON format.
    
    Intent: ${intent}
    Message: "${message}"
    
    Please return a JSON object matching this structure:
    ${JSON.stringify(schema, null, 2)}
    
    Only return the JSON object. No additional text.
  `;

  try {
    const result = await geminiClient.processWithStructuredOutput(prompt, [], schema);
    return result;
  } catch (error) {
    console.error("Error extracting entities with LLM:", error);
    return {};
  }
}

/**
 * Maintains conversation state across multiple interactions.
 */
export class ConversationContext {
  constructor() {
    this.current_products = [];
    this.current_product = null;
    this.last_intent = null;
    this.cart_id = null;
  }

  updateContext(message, intent, entities) {
    this.last_intent = intent;

    if (intent === INTENTS.SEARCH_PRODUCTS && entities.search_terms?.length > 0) {
      this.last_search_terms = entities.search_terms;
    }

    if (intent === INTENTS.PRODUCT_DETAILS && entities.product_id) {
      this.current_product = entities.product_id;
    }

    if (intent === INTENTS.ADD_TO_CART && !entities.merchandise_id && this.current_product) {
      return {
        intent,
        entities: {
          ...entities,
          merchandise_id: this.current_product
        }
      };
    }

    return { intent, entities };
  }

  setCurrentProducts(products) {
    this.current_products = products;
  }

  setCurrentProduct(productId) {
    this.current_product = productId;
  }

  setCartId(cartId) {
    this.cart_id = cartId;
  }
}