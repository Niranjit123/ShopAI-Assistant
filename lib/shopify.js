export default class ShopifyClient {
  constructor(shopDomain, storefrontAccessToken) {
    this.shopDomain = shopDomain;
    this.storefrontAccessToken = storefrontAccessToken;
    this.apiVersion = process.env.SHOPIFY_API_VERSION || '2024-04';
  }

  async graphql(query, variables = {}) {
    console.log('--- DEBUG: Sending GraphQL Request ---');
    console.log('GraphQL Query:\n', query);
    console.log('GraphQL Variables:\n', variables);
    console.log('-------------------------------------');

    const response = await fetch(
      `https://${this.shopDomain}/api/${this.apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': this.storefrontAccessToken,
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    return response.json();
  }

  async searchProducts(searchTerms, filters = {}) {
    // Build the search query string
    let queryString = searchTerms.join(' ');

    // Add filters to query
    if (filters.color && filters.color.length > 0) {
      queryString += ` ${filters.color.join(' ')}`;
    }

    if (filters.size && filters.size.length > 0) {
      queryString += ` ${filters.size.join(' ')}`;
    }

    const query = `
        query SearchProducts($query: String!, $first: Int!) {
          products(first: $first, query: $query) {
            edges {
              node {
                id
                title
                description
                handle
                priceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
                images(first: 1) {
                  edges {
                    node {
                      url
                    }
                  }
                }
                variants(first: 10) {
                  edges {
                    node {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                      availableForSale
                    }
                  }
                }
              }
            }
          }
        }
      `;

    const variables = {
      query: queryString,
      first: 10,
    };

    const response = await this.graphql(query, variables);

    // Format the response
    if (
      response.data &&
      response.data.products &&
      response.data.products.edges
    ) {
      return response.data.products.edges.map((edge) => {
        const product = edge.node;
        return {
          id: product.id,
          title: product.title,
          description: product.description,
          handle: product.handle,
          priceRange: product.priceRange,
          image: product.images.edges[0]?.node || null,
          variants: product.variants.edges.map((variantEdge) => variantEdge.node),
        };
      });
    }

    return [];
  }

  async searchProductsWithFilters({ productType, attributes, minPrice, maxPrice, brand, searchTerms, sortBy = 'RELEVANCE' }) {
    let queryParts = [];

    if (productType) {
      queryParts.push(`product_type:'${productType}'`);
    }
    if (brand) {
      queryParts.push(`vendor:'${brand}'`); // Assuming brand maps to vendor in Shopify
    }
    if (attributes && attributes.length > 0) {
      attributes.forEach(attr => {
        // Assuming attributes are mapped to tags or can be part of a general text search
        // For more precise attribute filtering, tags are common: tag:'${attr}'
        // Or, if they are just descriptive words, they can be part of the main search_terms
        queryParts.push(`tag:'${attr.toLowerCase()}'`); // Example: using tags for attributes
      });
    }
    if (searchTerms && searchTerms.length > 0) {
      queryParts.push(searchTerms.join(' ')); // Add general search terms
    }

    // Join all text-based query parts. If attributes are tags, they are ANDed.
    // Example: "product_type:'shoes' AND tag:'red' AND tag:'running'"
    // If searchTerms are also present: "(product_type:'shoes' AND tag:'red' AND tag:'running') AND (other search terms)"
    // For simplicity, we'll combine them. Shopify's query syntax can be nuanced.
    // A more robust approach might involve constructing a more complex query string with parentheses.
    let queryString = queryParts.join(' AND ');
    if (!queryString && searchTerms && searchTerms.length > 0) {
        queryString = searchTerms.join(' '); // Fallback if only search terms provided
    } else if (!queryString) {
        queryString = ""; // Default to empty if no textual filters
    }


    const query = `
      query SearchComplexProducts($queryString: String!, $sortKey: ProductSortKeys, $first: Int!) {
        products(first: $first, query: $queryString, sortKey: $sortKey) {
          edges {
            node {
              id
              title
              description
              descriptionHtml
              handle
              productType
              tags
              vendor # For brand
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    availableForSale
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      queryString: queryString,
      sortKey: sortBy,
      first: 10, // Number of products to fetch
    };

    const response = await this.graphql(query, variables);

    let products = [];
    if (response.data && response.data.products && response.data.products.edges) {
      products = response.data.products.edges.map((edge) => {
        const product = edge.node;
        return {
          id: product.id,
          title: product.title,
          description: product.description,
          descriptionHtml: product.descriptionHtml,
          handle: product.handle,
          productType: product.productType,
          tags: product.tags,
          vendor: product.vendor,
          priceRange: product.priceRange,
          image: product.images.edges[0]?.node || null,
          variants: product.variants.edges.map((variantEdge) => variantEdge.node),
        };
      });
    }

    // Post-fetch price filtering (Shopify's query language for price on product level is limited)
    if (minPrice !== undefined) {
      products = products.filter(p => parseFloat(p.priceRange.minVariantPrice.amount) >= minPrice);
    }
    if (maxPrice !== undefined) {
      products = products.filter(p => parseFloat(p.priceRange.minVariantPrice.amount) <= maxPrice);
    }
    
    return products;
  }

  // Existing method for GID - can be kept if used elsewhere, or removed if not.
  async getProductDetails(productId) {
    const query = `
        query GetProduct($id: ID!) {
          product(id: $id) {
            id
            title
            description
            descriptionHtml
            handle
            availableForSale
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 5) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  availableForSale
                  selectedOptions {
                    name
                    value
                  }
                  // image { url altText } // Optionally fetch variant image if needed
                }
              }
            }
            options {
              name
              values
            }
          }
        }
      `;
    const variables = { id: productId };
    // console.log("--- DEBUG: Sending GraphQL Request (getProductDetails by GID) ---");
    // console.log("GraphQL Query:\n", query);
    // console.log("GraphQL Variables:\n", JSON.stringify(variables, null, 2));
    // console.log("-------------------------------------");
    const response = await this.graphql(query, variables);

    let product = response.data?.product;
    if (product) {
      // Ensure availableForSale is set based on variants if not directly available
      if (typeof product.availableForSale === 'undefined' && product.variants?.edges) {
        product.availableForSale = product.variants.edges.some(edge => edge.node.availableForSale);
      }
      // Flatten variants
      if (product.variants && product.variants.edges) {
        product.variants = product.variants.edges.map(edge => edge.node);
      } else {
        product.variants = []; // Ensure variants is always an array
      }
      // Set primary image object
      if (product.images && product.images.edges && product.images.edges.length > 0) {
        product.image = product.images.edges[0].node;
      } else {
        product.image = null; // Ensure image property exists
      }
    }
    return product || null;
  }

  async getProductDetailsByHandle(handle) {
    const query = `
      query GetProductByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          id # This is the GID, useful for cart operations
          title
          description
          descriptionHtml
          handle
          availableForSale
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 20) {
            edges {
              node {
                id # Variant GID
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          options {
            name
            values
          }
        }
      }
    `;
    const variables = { handle: handle };
     // --- DEBUG ---
    // console.log("--- DEBUG: Sending GraphQL Request (getProductDetailsByHandle) ---");
    // console.log("GraphQL Query:\n", query);
    // console.log("GraphQL Variables:\n", JSON.stringify(variables, null, 2));
    // console.log("-------------------------------------");
    // --- END DEBUG ---
    const response = await this.graphql(query, variables);
    let product = response.data?.productByHandle; // Changed const to let

    if (product) { // Added this block
      // Ensure availableForSale is set based on variants if not directly available
      if (typeof product.availableForSale === 'undefined' && product.variants?.edges) {
        product.availableForSale = product.variants.edges.some(edge => edge.node.availableForSale);
      }
      // Flatten variants
      if (product.variants && product.variants.edges) {
        product.variants = product.variants.edges.map(edge => edge.node);
      } else {
        product.variants = []; // Ensure variants is always an array
      }
      // Set primary image object
      if (product.images && product.images.edges && product.images.edges.length > 0) {
        product.image = product.images.edges[0].node;
      } else {
        product.image = null; // Ensure image property exists
      }
    }
    return product || null;
  }

  async getProductsDetailsByIds(handles) { // Parameter renamed to 'handles' for clarity
    if (!handles || handles.length === 0) {
      return [];
    }
    console.log(`[ShopifyClient] Fetching details for ${handles.length} product handles:`, handles);
    
    const productDetailsPromises = handles.map(handle => {
      // Now we explicitly call getProductDetailsByHandle
      return this.getProductDetailsByHandle(handle).catch(error => {
        console.error(`[ShopifyClient] Error fetching details for product handle "${handle}":`, error);
        return null; // Return null for this product if an error occurs
      });
    });

    const results = await Promise.all(productDetailsPromises);
    return results.filter(product => product !== null); // Filter out any nulls from errors
  }

  async createCart() {
    const mutation = `
        mutation cartCreate {
          cartCreate {
            cart {
              id
              checkoutUrl
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

    const response = await this.graphql(mutation);
    return response.data?.cartCreate?.cart || null;
  }

  async addToCart(cartId, merchandiseId, quantity = 1) {
    const mutation = `
        mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart {
              id
              lines(first: 10) {
                edges {
                  node {
                    id
                    quantity
                    merchandise {
                      ... on ProductVariant {
                        id
                        title
                        price {
                          amount
                          currencyCode
                        }
                        product {
                          title
                          id
                        }
                      }
                    }
                  }
                }
              }
              cost {
                subtotalAmount {
                  amount
                  currencyCode
                }
                totalAmount {
                  amount
                  currencyCode
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

    const variables = {
      cartId,
      lines: [{ merchandiseId, quantity }],
    };

    const response = await this.graphql(mutation, variables);
    return response.data?.cartLinesAdd?.cart || null;
  }

  async getCart(cartId) {
    const query = `
        query getCart($cartId: ID!) {
          cart(id: $cartId) {
            id
            lines(first: 10) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                      product {
                        title
                        id
                      }
                    }
                  }
                }
              }
            }
            cost {
              subtotalAmount {
                amount
                currencyCode
              }
              totalAmount {
                amount
                currencyCode
              }
            }
            checkoutUrl
          }
        }
      `;

    const variables = { cartId };
    const response = await this.graphql(query, variables);

    return response.data?.cart || null;
  }
}