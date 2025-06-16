import { NextResponse } from 'next/server';
import ShopifyClient from '@/lib/shopify';

// Initialize Shopify client
// Note: The instantiation of ShopifyClient is moved inside the POST handler
// to ensure process.env variables are accessed in the request context if there are any Next.js specific behaviors.
// However, typically, top-level instantiation should work if .env files are correctly loaded at build/startup.

// Store cart IDs (in a real app, use a proper session store)
const sessions = {};

export async function POST(request) {
  try {
    // Log the environment variables at the start of the request handler
    console.log('[API /cart/add] SHOPIFY_STORE_DOMAIN:', process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN);
    console.log('[API /cart/add] SHOPIFY_STOREFRONT_ACCESS_TOKEN:', process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN ? 'Exists' : 'MISSING or Empty');

    // It's crucial that SHOPIFY_STORE_DOMAIN is defined here.
    // If it's undefined, the ShopifyClient will not work.
    if (!process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN) {
      console.error('❌ [API /cart/add] FATAL: SHOPIFY_STORE_DOMAIN is not defined in environment variables!');
      return NextResponse.json(
        { error: 'Server configuration error: Shopify store domain not set.' },
        { status: 500 }
      );
    }
    if (!process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      console.error('❌ [API /cart/add] FATAL: SHOPIFY_STOREFRONT_ACCESS_TOKEN is not defined in environment variables!');
      return NextResponse.json(
        { error: 'Server configuration error: Shopify access token not set.' },
        { status: 500 }
      );
    }
    
    const shopify = new ShopifyClient(
      process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN,
      process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN
    );

    const { productId, variantId, quantity, sessionId = 'default' } = await request.json();
    
    // Log the received variantId to help debug
    console.log(`[API /cart/add] Received - productId: ${productId}, variantId: ${variantId}, quantity: ${quantity}`);

    // Basic validation for variantId format (Shopify ProductVariant GIDs contain "ProductVariant")
    if (!variantId || typeof variantId !== 'string' || !variantId.includes('ProductVariant')) {
      console.error(`[API /cart/add] Invalid variantId received: "${variantId}". Expected a ProductVariant GID.`);
      return NextResponse.json(
        { error: `Invalid item variant specified. Expected a ProductVariant GID but received: ${variantId}` },
        { status: 400 } // Bad Request
      );
    }
    
    // Get or create cart
    if (!sessions[sessionId] || !sessions[sessionId].cartId) {
      const cart = await shopify.createCart();
      // Add a check to ensure cart creation was successful
      if (!cart || !cart.id) {
        console.error('[API /cart/add] Failed to create cart. Shopify createCart returned:', cart);
        return NextResponse.json(
          { error: 'Failed to initialize cart.' },
          { status: 500 }
        );
      }
      if (!sessions[sessionId]) {
        sessions[sessionId] = {};
      }
      sessions[sessionId].cartId = cart.id;
    }
    
    const cartId = sessions[sessionId].cartId;
    
    // Add item to cart
    const updatedCart = await shopify.addToCart(cartId, variantId, quantity || 1);
    
    // Check if updatedCart is null (which means addToCart failed)
    if (!updatedCart) {
      console.error(`[API /cart/add] Failed to add item to cart. shopify.addToCart returned null. cartId: ${cartId}, variantId: ${variantId}. This often means the variantId was invalid or the item is unavailable.`);
      // The shopify.js client should ideally log userErrors from Shopify if available.
      return NextResponse.json(
        { error: 'Failed to add item to cart. The variant might be invalid, unavailable, or an issue occurred with Shopify API.' },
        { status: 400 } // Or 500 if it's an unexpected server/Shopify issue
      );
    }
    
    // Format cart items for the response
    const cartItems = updatedCart.lines.edges.map(edge => {
      const merchandise = edge.node.merchandise;
      return {
        id: edge.node.id,
        title: merchandise.product.title,
        variantTitle: merchandise.title,
        quantity: edge.node.quantity,
        price: merchandise.price.amount,
        currencyCode: merchandise.price.currencyCode, // Ensure this is included if needed per item
        image: merchandise.image?.url
      };
    });
    
    // Ensure product object is always structured, even if finding the specific title fails
    const productForResponse = {
      id: productId, // Use the original productId
      title: updatedCart.lines.edges.find(edge => edge.node.merchandise.product.id === productId)?.node.merchandise.product.title || 'Selected Product',
      variantId: variantId,
    };
    
    return NextResponse.json({
      success: true,
      cart: cartItems,
      product: productForResponse,
      total: updatedCart.cost.totalAmount.amount,
      currencyCode: updatedCart.cost.totalAmount.currencyCode // Ensure this is present
    });
    
  } catch (error) {
    console.error('Error adding to cart:', error);
    // Log the cause if it exists, for more detailed debugging
    if (error.cause) {
      console.error('Cause of error:', error.cause);
    }
    return NextResponse.json(
      { error: 'An error occurred adding the item to cart' },
      { status: 500 }
    );
  }
}
