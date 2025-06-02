import { INTENTS } from './intent-recognition';
import { INTENT_TYPES } from '../agents/dispatchAgent';

const INTENT_MAP = {
  [INTENTS.SEARCH_PRODUCTS]: INTENT_TYPES.PRODUCT,
  [INTENTS.PRODUCT_DETAILS]: INTENT_TYPES.PRODUCT,
  [INTENTS.ADD_TO_CART]: INTENT_TYPES.PRODUCT,
  [INTENTS.CHECKOUT]: INTENT_TYPES.PRODUCT,
  [INTENTS.ORDER_STATUS]: INTENT_TYPES.SUPPORT,
  [INTENTS.GENERAL_INQUIRY]: INTENT_TYPES.FAQ
};

export async function extractIntent(message, geminiClient) {
  // Get the raw intent using existing Gemini classification
  const rawIntent = await classifyIntentWithLLM(message, geminiClient);
  
  // Map to our agent system intent
  return INTENT_MAP[rawIntent] || INTENT_TYPES.FALLBACK;
}
