import { NextResponse } from 'next/server';
import ShopifyClient from '@/lib/shopify';

// Initialize Shopify client
const shopify = new ShopifyClient(
  process.env.SHOPIFY_STORE_DOMAIN,
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
);

// Store cart IDs (in a real app, use a proper session store)
const sessions = {};

export async function POST(request) {
  try {
    const { productId, variantId, quantity, sessionId = 'default' } = await request.json();
    
    // Get or create cart
    if (!sessions[sessionId] || !sessions[sessionId].cartId) {
      const cart = await shopify.createCart();
      if (!sessions[sessionId]) {
        sessions[sessionId] = {};
      }
      sessions[sessionId].cartId = cart.id;
    }
    
    const cartId = sessions[sessionId].cartId;
    
    // Add item to cart
    const updatedCart = await shopify.addToCart(cartId, variantId, quantity || 1);
    
    // Format cart items for the response
    const cartItems = updatedCart.lines.edges.map(edge => {
      const item = edge.node;
      const merchandise = item.merchandise;
      
      return {
        id: item.id,
        title: merchandise.product.title,
        variant: merchandise.title,
        price: merchandise.price.amount,
        quantity: item.quantity
      };
    });
    
    // Get product details for the added item
    const product = {
      title: updatedCart.lines.edges.find(
        edge => edge.node.merchandise.id === variantId
      )?.node.merchandise.product.title || 'Product'
    };
    
    return NextResponse.json({
      success: true,
      cart: cartItems,
      product,
      total: updatedCart.cost.totalAmount.amount
    });
    
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { error: 'An error occurred adding the item to cart' },
      { status: 500 }
    );
  }
}
