export const supportAgent = {
  handle: async (query) => {
    const keywords = query.toLowerCase();
    if (keywords.includes('order') || keywords.includes('tracking')) {
      return {
        type: 'support',
        content: 'To track your order, please provide your order number.',
        metadata: { intent: 'SUPPORT', topic: 'order_tracking' }
      };
    }
    if (keywords.includes('account') || keywords.includes('profile')) {
      return {
        type: 'support',
        content: 'You can manage your account at [your-account-url].',
        metadata: { intent: 'SUPPORT', topic: 'account_management' }
      };
    }
    return {
      type: 'support',
      content: 'I can help with order tracking, account management, and other support topics.',
      metadata: { intent: 'SUPPORT', topic: 'general' }
    };
  }
};
