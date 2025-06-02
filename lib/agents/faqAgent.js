const faqDocs = {
  shipping: "Free shipping on orders over $50. Delivery within 3-5 business days.",
  returns: "30-day return policy. Items must be in original condition.",
  sizing: "Please refer to our size guide for accurate measurements.",
  payment: "We accept all major credit cards and PayPal."
};

export const faqAgent = {
  handle: async (query) => {
    const keywords = query.toLowerCase();
    if (keywords.includes('shipping') || keywords.includes('delivery')) {
      return {
        type: 'faq',
        content: faqDocs.shipping,
        metadata: { intent: 'FAQ', topic: 'shipping' }
      };
    }
    if (keywords.includes('return') || keywords.includes('refund')) {
      return {
        type: 'faq',
        content: faqDocs.returns,
        metadata: { intent: 'FAQ', topic: 'returns' }
      };
    }
    if (keywords.includes('size') || keywords.includes('fit')) {
      return {
        type: 'faq',
        content: faqDocs.sizing,
        metadata: { intent: 'FAQ', topic: 'sizing' }
      };
    }
    if (keywords.includes('payment') || keywords.includes('card')) {
      return {
        type: 'faq',
        content: faqDocs.payment,
        metadata: { intent: 'FAQ', topic: 'payment' }
      };
    }
    return {
      type: 'faq',
      content: "I couldn't find a specific answer. Could you please rephrase your question?",
      metadata: { intent: 'FAQ', topic: 'unknown' }
    };
  }
};
