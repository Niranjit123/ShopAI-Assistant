export const fallbackAgent = {
  handle: async (query) => {
    const greetings = ['hi', 'hello', 'hey'];
    const keywords = query.toLowerCase();
    if (greetings.some(greeting => keywords.includes(greeting))) {
      return {
        type: 'fallback',
        content: 'Hi there! How can I assist you today?',
        metadata: { intent: 'FALLBACK', topic: 'greeting' }
      };
    }
    return {
      type: 'fallback',
      content: 'I can help with product searches, FAQs, and support topics. Could you please rephrase your question?',
      metadata: { intent: 'FALLBACK', topic: 'unknown' }
    };
  }
};
