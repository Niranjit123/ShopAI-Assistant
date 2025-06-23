// lib/intent-recognition.js

export const INTENTS = {
  SEARCH_PRODUCTS: 'search_products',
  PRODUCT_DETAILS: 'product_details',
  ADD_TO_CART: 'add_to_cart',
  CHECKOUT: 'checkout', // User wants to initiate or has query about checkout process
  ORDER_STATUS: 'order_status', // User asks about the status of a specific order
  FAQ: 'faq', // User asks a general question (e.g., "What's your return policy?")
  SUPPORT: 'support', // User has a specific problem needing help (e.g., "My order was damaged")
  GENERAL_INQUIRY: 'general_inquiry' // Chit-chat, greetings, or very broad questions
};

/**
 * Classifies intent using Gemini LLM.
 */
export async function classifyIntentWithLLM(message, geminiClient, messageHistory = []) {
  if (!geminiClient || typeof geminiClient.generateResponse !== 'function') {
    console.error('[IntentRecognition] Invalid Gemini client provided to classifyIntentWithLLM');
    // It's often better to throw an error here to stop execution if a critical component is missing
    throw new Error('Invalid Gemini client provided for intent classification.');
  }

  const prompt = `
    Analyze the following user message and determine the single most appropriate intent from the list below.
    Consider the conversation history if available.

    Intents:
    - ${INTENTS.SEARCH_PRODUCTS}: User wants to find or search for products.
        Examples: "Show me red shoes", "Looking for summer dresses"
    - ${INTENTS.PRODUCT_DETAILS}: User asks for more information about a specific product.
        Examples: "Tell me more about this laptop", "What material is this shirt?"
    - ${INTENTS.ADD_TO_CART}: User wants to add one or more items to their shopping cart.
        Examples: "Add this to my cart", "I want to buy these two items"
    - ${INTENTS.CHECKOUT}: User expresses a desire to start the checkout process or asks about how checkout works if it's not a problem.
        Examples: "I'm ready to checkout", "How do I complete my purchase?"
    - ${INTENTS.ORDER_STATUS}: User is asking about the status or tracking of an existing order.
        Examples: "Where is my order?", "Track my shipment for order #123"
    - ${INTENTS.FAQ}: User is asking a general question that can likely be answered by a knowledge base or FAQ document. This is for questions not tied to a specific, problematic user experience.
        Examples: "What is your return policy?", "How long does shipping take?", "Do you ship internationally?"
    - ${INTENTS.SUPPORT}: User has a specific issue, problem, complaint, or request that likely requires assistance, troubleshooting, or human intervention. This is for when something is wrong or they need help with a non-standard task.
        Examples: "My order arrived damaged", "I can't reset my password", "The discount code isn't working", "I need help with a refund for order #456", "i received a defective product"
    - ${INTENTS.GENERAL_INQUIRY}: For general conversation, greetings, or messages that don't fit any other category.
        Examples: "Hello", "Thanks", "How are you?"

    IMPORTANT: Respond with ONLY the intent name from the list above (e.g., "${INTENTS.SUPPORT}" or "${INTENTS.SEARCH_PRODUCTS}"). Do NOT include any other words, explanations, or punctuation.

    User Message: "${message}"
  `;

  try {
    const rawResponse = await geminiClient.generateResponse(prompt, messageHistory);
    // Log the raw response from the LLM for debugging
    console.log('[IntentRecognition] Raw LLM response for intent classification:', JSON.stringify(rawResponse));

    if (typeof rawResponse !== 'string' || rawResponse.trim() === '') {
      console.warn('[IntentRecognition] LLM returned an empty or non-string response for intent. Raw:', rawResponse);
      return { intent: INTENTS.GENERAL_INQUIRY, confidence: 0.75, error: 'LLM returned empty or non-string response for intent' };
    }

    const classifiedIntent = rawResponse.trim();

    if (Object.values(INTENTS).includes(classifiedIntent)) {
      console.log(`[IntentRecognition] Successfully classified intent: ${classifiedIntent}`);
      return { intent: classifiedIntent, confidence: 0.95 };
    } else {
      // Fallback: Check if the raw response *contains* a valid intent string.
      // This can happen if the LLM adds minor extra text despite instructions.
      for (const validIntent of Object.values(INTENTS)) {
        if (classifiedIntent.includes(validIntent)) {
          console.warn(`[IntentRecognition] LLM response may have included extra text, but a valid intent was found. Original: "${classifiedIntent}", Extracted: "${validIntent}"`);
          return { intent: validIntent, confidence: 0.90 }; // Slightly lower confidence
        }
      }
      // If no valid intent is found even with the .includes() check
      console.warn(`[IntentRecognition] Unknown or improperly formatted intent returned by LLM: "${classifiedIntent}". Falling back to GENERAL_INQUIRY.`);
      return { intent: INTENTS.GENERAL_INQUIRY, confidence: 0.8, rawLlmResponse: classifiedIntent, error: 'Unknown or improperly formatted intent from LLM' };
    }
  } catch (error) {
    console.error("[IntentRecognition] Error classifying intent with LLM:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during intent classification";
    return { intent: INTENTS.GENERAL_INQUIRY, confidence: 0.7, error: errorMessage };
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
    case INTENTS.ORDER_STATUS:
      schema = {
        order_id: "string"
      };
      promptDetails = "Extract the order ID if the user is asking about their order status. Example: 'What is the status of order #12345?' -> order_id: '12345'";
      break;
    case INTENTS.SUPPORT:
      schema = {
        order_id: "string",
        product_id: "string",
        issue_summary: "string" // A brief summary of the problem
      };
      promptDetails = "Extract order ID, product ID (if mentioned), and a brief summary of the user's issue if they are requesting support. Example: 'My order #A567 for the blue t-shirt arrived damaged.' -> order_id: 'A567', product_id: (if identifiable or user points to it), issue_summary: 'order arrived damaged'";
      break;
    default:
      return {}; // No specific entities for FAQ or GENERAL_INQUIRY by default
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
    console.error(`[IntentRecognition] Error extracting entities for intent ${intent}:`, error);
    return {}; // Return empty object on error
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