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
export async function classifyIntentWithLLM(message, geminiClient, messageHistory = []) { // Added messageHistory
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
    // Pass messageHistory to Gemini client
    const response = await geminiClient.generateResponse(prompt, messageHistory);
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
export async function extractEntitiesWithLLM(message, intent, geminiClient, messageHistory = []) { // Added messageHistory
  if (!geminiClient || typeof geminiClient.processWithStructuredOutput !== 'function') {
    throw new Error('Invalid Gemini client provided');
  }

  let schema = {};
  let promptDetails = "";

  switch (intent) {
    case INTENTS.SEARCH_PRODUCTS:
      schema = {
        search_terms: ["string"], // General terms if not fitting other categories
        product_type: "string",   // e.g., "shoes", "jackets", "bags"
        attributes: ["string"],   // e.g., ["red", "running", "waterproof", "leather"]
        price_min: "number",      // e.g., 50 (for "over $50")
        price_max: "number",      // e.g., 100 (for "under $100")
        brand: "string"           // e.g., "Nike", "Adidas"
      };
      promptDetails = `
        Extract the product type (e.g., shoes, shirt), attributes (e.g., color like red, features like running, material like cotton),
        price constraints (min_price for "over $X", max_price for "under $X" or "less than $X"), and any brand names.
        General search terms can be used for keywords that don't fit specific categories.
        For "red running shoes under $100", product_type would be "shoes", attributes ["red", "running"], price_max 100.
        For "Nike t-shirts over $30", product_type would be "t-shirts", brand "Nike", price_min 30.
      `;
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
    Follow the provided schema strictly. If a field is not present in the message, omit it from the JSON.
    ${promptDetails}

    Intent: ${intent}
    Message: "${message}"
    
    Schema:
    ${JSON.stringify(schema, null, 2)}

    Extracted JSON:
  `;

  try {
    // Pass messageHistory to Gemini client
    const result = await geminiClient.processWithStructuredOutput(prompt, messageHistory, schema);
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