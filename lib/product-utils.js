/**
 * Extracts basic search terms and potentially some predefined filter keywords.
 * This is a fallback and less sophisticated than LLM-based entity extraction.
 * @param {string} message - The user's message.
 * @returns {{searchTerms: string[], filters: object}}
 */
export function extractProductFilters(message) {
  if (!message || typeof message !== 'string') {
    return { searchTerms: [], filters: {} };
  }
  const words = message.toLowerCase().split(/\s+/);
  const searchTerms = [];
  const filters = {
    color: [],
    size: [],
    // Add other simple filter categories if needed
  };

  // Example: very simple keyword-based filter extraction
  // This is rudimentary and would be much improved by NLP/NLU
  const colorKeywords = ["red", "blue", "green", "black", "white", "yellow", "pink", "purple", "orange", "brown", "gray", "silver", "gold"];
  const sizeKeywords = ["small", "medium", "large", "xl", "xs", "s", "m", "l"];

  words.forEach(word => {
    if (colorKeywords.includes(word)) {
      filters.color.push(word);
    } else if (sizeKeywords.includes(word)) {
      filters.size.push(word);
    } else {
      searchTerms.push(word);
    }
  });

  // Remove common words that might not be good search terms if they were not filters
  const commonWords = ["a", "an", "the", "is", "are", "for", "show", "me", "find", "search", "i", "want", "looking"];
  const finalSearchTerms = searchTerms.filter(term => !commonWords.includes(term) && !filters.color.includes(term) && !filters.size.includes(term));


  return { searchTerms: finalSearchTerms.length > 0 ? finalSearchTerms : searchTerms, filters };
}

/**
 * Formats a list of products and a search description into a string response.
 * @param {Array<object>} products - Array of product objects.
 * @param {string} searchDescription - A description of the search performed.
 * @returns {string} A formatted string response.
 */
export function formatProductResponse(products, searchDescription) {
  if (!Array.isArray(products)) {
    return "I encountered an issue fetching product information.";
  }

  if (products.length === 0) {
    return `I couldn't find any products matching "${searchDescription}". Would you like to try a different search?`;
  }

  const numProducts = products.length;
  let response = `I found ${numProducts} product${numProducts > 1 ? 's' : ''} related to "${searchDescription}":\n`;

  // products.slice(0, 3).forEach((product, index) => { // Show top 3 for brevity in chat
  //   const title = product.title || 'Unnamed Product';
  //   const price = product.priceRange?.minVariantPrice?.amount || product.price || 'N/A';
  //   const currency = product.priceRange?.minVariantPrice?.currencyCode || '';
  //   response += `${index + 1}. ${title} - ${price} ${currency}\n`;
  // });

  // if (numProducts > 3) {
  //   response += `... and ${numProducts - 3} more. You can see all results in the product section.`;
  // }
  
  // For now, let's keep it simple and just state the number of products.
  // The actual product display will happen via the product cards.
  if (numProducts === 1) {
    response = `I found a product matching "${searchDescription}". Check it out below!`;
  } else {
     response = `I found ${numProducts} products matching "${searchDescription}". Take a look at the results below.`;
  }


  return response;
}

/**
 * Formats the details of a single product into a string response.
 * (Currently not heavily used if product details are shown in a modal or separate UI)
 * @param {object} product - The product object.
 * @returns {string} A formatted string with product details.
 */
export function formatProductDetails(product) {
  if (!product || typeof product !== 'object') {
    return "I couldn't retrieve the details for that product.";
  }

  const title = product.title || 'Unnamed Product';
  const description = product.description || 'No description available.';
  const price = product.priceRange?.minVariantPrice?.amount || product.price || 'Price not available';
  const currency = product.priceRange?.minVariantPrice?.currencyCode || '';

  let details = `Product: ${title}\n`;
  details += `Price: ${price} ${currency}\n`;
  details += `Description: ${description.substring(0, 150)}${description.length > 150 ? '...' : ''}\n`; // Shorten description for chat

  // Add more details as needed, e.g., variants, availability
  // if (product.variants && product.variants.length > 0) {
  //   details += `Variants: ${product.variants.map(v => v.title).join(', ')}\n`;
  // }

  return details;
}