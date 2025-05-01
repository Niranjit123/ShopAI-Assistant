
export default class ShopifyClient {
    constructor(shopDomain, storefrontAccessToken) {
      this.shopDomain = shopDomain;
      this.storefrontAccessToken = storefrontAccessToken;
      this.apiVersion = '2023-10'; // Update to the current version
    }
    
    async graphql(query, variables = {}) {
      const response = await fetch(
        `https://${this.shopDomain}/api/${this.apiVersion}/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': this.storefrontAccessToken
          },
          body: JSON.stringify({ query, variables })
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
        first: 10
      };
      
      const response = await this.graphql(query, variables);
      
      // Format the response
      if (response.data && response.data.products && response.data.products.edges) {
        return response.data.products.edges.map(edge => {
          const product = edge.node;
          return {
            id: product.id,
            title: product.title,
            description: product.description,
            handle: product.handle,
            priceRange: product.priceRange,
            image: product.images.edges[0]?.node || null,
            variants: product.variants.edges.map(variantEdge => variantEdge.node)
          };
        });
      }
      
      return [];
    }
    
    async getProductDetails(productId) {
      const query = `
        query GetProduct($id: ID!) {
          product(id: $id) {
            id
            title
            description
            descriptionHtml
            handle
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
      const response = await this.graphql(query, variables);
      
      return response.data?.product || null;
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
        lines: [{ merchandiseId, quantity }]
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