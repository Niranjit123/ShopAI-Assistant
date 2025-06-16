import { productAgent } from './productAgent';
import { faqAgent } from './faqAgent';
import { supportAgent } from './supportAgent';
import { fallbackAgent } from './fallbackAgent';

const agents = {
  PRODUCT: productAgent,
  FAQ: faqAgent,
  SUPPORT: supportAgent,
  FALLBACK: fallbackAgent
};

export const INTENT_TYPES = {
  PRODUCT: 'PRODUCT',
  FAQ: 'FAQ',
  SUPPORT: 'SUPPORT',
  FALLBACK: 'FALLBACK'
};

export async function dispatch(message, intent, entities = {}, conversationHistory = []) {
  try {
    const agent = agents[intent] || agents.FALLBACK;
    // Pass message content, entities, and conversationHistory to the agent
    const response = await agent.handle(message.content, entities, conversationHistory);
    return response;
  } catch (error) {
    console.error('Agent dispatch error:', error);
    // Pass message content, entities, and conversationHistory to the fallback agent
    return agents.FALLBACK.handle(message.content, entities, conversationHistory);
  }
}
