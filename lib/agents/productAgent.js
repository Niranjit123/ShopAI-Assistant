import ShopifyClient from '../shopify';

const shopify = new ShopifyClient(
  process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN,
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN
);

export const productAgent = {
  handle: async (query, entities = {}) => {
    try {
      // Ensure searchTerms is always an array
      let searchTerms = entities.search_terms;
      if (!Array.isArray(searchTerms)) {
        if (typeof searchTerms === 'string') {
          searchTerms = [searchTerms];
        } else {
          searchTerms = [];
        }
      }
      const filters = entities.filters || {};
      // Search products using Shopify
      const products = await shopify.searchProducts(searchTerms, filters);
      
      // Format the response
      const response = formatProductResponse(products, searchTerms);
      
      return {
        type: 'product',
        content: response,
        metadata: {
          intent: 'PRODUCT',
          searchTerms,
          filters,
          numResults: products.length
        }
      };
    } catch (error) {
      console.error('Product search error:', error);
      return {
        type: 'product',
        content: 'Sorry, I had trouble finding those products. Could you try a different search?',
        metadata: {
          intent: 'PRODUCT',
          error: error.message
        }
      };
    }
  }
};

function extractProductFilters(query) {
  // Simple filter extraction - can be enhanced with more sophisticated parsing
  const searchTerms = [];
  const filters = {
    color: [],
    size: [],
    priceRange: [],
    category: []
  };

  // Split query into words and categorize them
  const words = query.toLowerCase().split(' ');
  
  words.forEach(word => {
    // Handle colors
    const colorKeywords = ['red', 'blue', 'green', 'black', 'white'];
    if (colorKeywords.includes(word)) {
      filters.color.push(word);
      return;
    }

    // Handle sizes
    const sizeKeywords = ['s', 'm', 'l', 'xl', 'xxl'];
    if (sizeKeywords.includes(word)) {
      filters.size.push(word.toUpperCase());
      return;
    }

    // Handle price ranges
    if (word.includes('$') || word.includes('price')) {
      // Basic price range handling - can be enhanced
      filters.priceRange.push(word);
      return;
    }

    // Add to search terms
    searchTerms.push(word);
  });

  return {
    searchTerms: searchTerms.join(' '),
    filters
  };
}

export function formatProductResponse(products, searchTerms) {
  let response;
  if (products.length === 0) {
    response = `I couldn't find any products matching "${searchTerms}". Would you like to try a different search?`;
  } else {
    response = `I found ${products.length} products matching "${searchTerms}":\n\n`;
    
    products.forEach((product, index) => {
      response += `${index + 1}. ${product.title}\n`;
      response += `Price: ${product.priceRange.minVariantPrice.amount} ${product.priceRange.minVariantPrice.currencyCode}\n`;
      
      if (product.images && product.images.edges.length > 0) {
        response += `Image: ${product.images.edges[0].node.url}\n`;
      }
      
      response += `Description: ${product.description}\n\n`;
    });
  }
  return response;
}
