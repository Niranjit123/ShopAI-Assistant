
export const INTENTS = {
    SEARCH_PRODUCTS: 'search_products',
    PRODUCT_DETAILS: 'product_details',
    ADD_TO_CART: 'add_to_cart',
    CHECKOUT: 'checkout',
    ORDER_STATUS: 'order_status',
    GENERAL_INQUIRY: 'general_inquiry'
  };
  
  // Simple keyword-based intent recognition
  // In a production system, you'd use a more sophisticated model or Gemini's classification capabilities
  export function classifyIntent(message) {
    const text = message.toLowerCase();
    
    // Define keyword patterns for each intent
    const patterns = {
      [INTENTS.SEARCH_PRODUCTS]: [
        'show me', 'find', 'search for', 'looking for', 'do you have', 
        'show', 'browse', 'display', 'see all'
      ],
      [INTENTS.PRODUCT_DETAILS]: [
        'tell me more about', 'details', 'specifications', 'features', 
        'more info', 'tell me about', 'what\'s', 'how is', 'is it'
      ],
      [INTENTS.ADD_TO_CART]: [
        'add to cart', 'add to basket', 'buy this', 'purchase', 'get this',
        'add it', 'put it in my cart', 'add this', 'i want this', 'i\'ll take'
      ],
      [INTENTS.CHECKOUT]: [
        'checkout', 'place order', 'complete purchase', 'finish order',
        'buy now', 'pay now', 'proceed to payment', 'complete my order'
      ],
      [INTENTS.ORDER_STATUS]: [
        'where is my order', 'track', 'shipping status', 'delivery status',
        'when will', 'has my order', 'order status'
      ]
    };
    
    // Check each intent pattern
    for (const [intent, keywords] of Object.entries(patterns)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return { intent, confidence: 0.8 }; // Simple confidence score
        }
      }
    }
    
    // Default to general inquiry
    return { intent: INTENTS.GENERAL_INQUIRY, confidence: 0.6 };
  }
  
  export function extractEntities(message, intent) {
    const text = message.toLowerCase();
    const entities = {};
    
    switch (intent) {
      case INTENTS.SEARCH_PRODUCTS:
        entities.search_terms = [];
        entities.filters = {
          color: [],
          size: [],
          price_range: null,
          category: null
        };
        
        // Extract colors
        const colors = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'purple', 'pink', 'orange', 'brown'];
        colors.forEach(color => {
          if (text.includes(color)) {
            entities.filters.color.push(color);
          }
        });
        
        // Extract product types (basic implementation)
        const productTypes = ['shirt', 'pants', 'dress', 'shoes', 'jacket', 'hat', 'socks', 'watch', 'bag'];
        productTypes.forEach(type => {
          if (text.includes(type)) {
            entities.search_terms.push(type);
          }
        });
        
        // Extract sizes
        const sizes = ['small', 'medium', 'large', 'xl', 'xxl', 's', 'm', 'l'];
        sizes.forEach(size => {
          if (text.includes(size)) {
            entities.filters.size.push(size);
          }
        });
        
        // Extract price ranges
        if (text.includes('under $')) {
          const matches = text.match(/under \$(\d+)/);
          if (matches && matches[1]) {
            entities.filters.price_range = `< ${matches[1]}`;
          }
        }
        
        break;
        
      case INTENTS.ADD_TO_CART:
        entities.product_id = null; // Would be determined from conversation context
        entities.variant_id = null;
        entities.quantity = 1;
        
        // Extract quantity
        const quantityMatches = text.match(/(\d+) of|(\d+) items?/);
        if (quantityMatches) {
          const quantity = quantityMatches[1] || quantityMatches[2];
          if (quantity) {
            entities.quantity = parseInt(quantity);
          }
        }
        
        break;
        
      // Add more entity extractors for other intents
    }
    
    return entities;
  }
  
  // This maintains conversation state between messages
  export class ConversationContext {
    constructor() {
      this.current_products = [];
      this.current_product = null;
      this.last_intent = null;
      this.cart_id = null;
    }
    
    updateContext(message, intent, entities) {
      // Keep track of the latest intent
      this.last_intent = intent;
      
      // Update context based on intent
      if (intent === INTENTS.SEARCH_PRODUCTS) {
        // After a search, we'll store results that come back from the API
        // This would be set after the API call
      } 
      else if (intent === INTENTS.PRODUCT_DETAILS) {
        // User is asking about a specific product
        if (entities.product_id) {
          this.current_product = entities.product_id;
        }
      }
      else if (intent === INTENTS.ADD_TO_CART) {
        // If adding to cart without specifying product, use current product
        if (!entities.product_id && this.current_product) {
          entities.product_id = this.current_product;
          return {
            intent, 
            entities: {
              ...entities,
              product_id: this.current_product
            }
          };
        }
      }
      
      return { intent, entities };
    }
    
    // Store products from search results
    setCurrentProducts(products) {
      this.current_products = products;
    }
    
    // Set current product being discussed
    setCurrentProduct(productId) {
      this.current_product = productId;
    }
    
    // Set cart ID for the session
    setCartId(cartId) {
      this.cart_id = cartId;
    }
  }