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

export async function dispatch(query, intent, entities = {}) {
  try {
    const agent = agents[intent] || agents.FALLBACK;
    // Always pass both query and entities if the agent supports it
    return await agent.handle(query, entities);
  } catch (error) {
    console.error('Agent dispatch error:', error);
    return agents.FALLBACK.handle(query, entities);
  }
}
