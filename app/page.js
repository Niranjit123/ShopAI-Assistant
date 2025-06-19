'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import ShopifyClient from '../lib/shopify';
import { useCart } from './contexts/CartContext'; // Import useCart

export default function HomePage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { addToCart: addItemToCartContext } = useCart(); // Get addToCart from context

  const [categories, setCategories] = useState([
    { name: 'Featured Products', productType: null, items: [] },
  ]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productError, setProductError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  // const [cartData, setCartData] = useState({ items: [], total: 0, currencyCode: 'INR' }); // Removed local cart state

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Load products from Shopify
  useEffect(() => {
    const fetchProductsFromShopify = async () => {
      setIsLoadingProducts(true);
      setProductError(null);
      try {
        // Ensure NEXT_PUBLIC_SHOPIFY_DOMAIN and NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN are in your .env.local
        if (!process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN || !process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
          throw new Error("Shopify domain or access token is not configured in environment variables.");
        }
        const shopify = new ShopifyClient(
          process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN,
          process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN
        );

        // Fetch a default set of products (e.g., first 10, no specific query)
        // searchProductsWithFilters returns products with a somewhat flattened structure
        const fetchedShopifyProducts = await shopify.searchProductsWithFilters({ searchTerms: [], sortBy: 'BEST_SELLING' }); // Example: fetch best selling

        const mappedProducts = fetchedShopifyProducts.map(p => {
          const firstVariant = p.variants && p.variants.length > 0 ? p.variants[0] : null;
          return {
            id: p.id, // Shopify Product GID
            name: p.title,
            description: p.description,
            descriptionHtml: p.descriptionHtml,
            images: p.image ? [p.image.url] : ['/placeholder-image.png'], // Expects an array of image URLs
            variants: p.variants.map(v => ({ // Expects an array of variant objects
              id: v.id, // Shopify Variant GID
              title: v.title,
              // Shopify price is usually a string like "10.00"
              price: { amount: parseFloat(v.price.amount), currencyCode: v.price.currencyCode },
              availableForSale: v.availableForSale,
            })),
            productType: p.productType,
            tags: p.tags || [],
            // Store original Shopify product data if needed for modal or other complex logic
            shopifyProductData: p
          };
        });

        setCategories(prevCategories =>
          prevCategories.map(cat =>
            cat.productType === null
              ? { ...cat, items: mappedProducts }
              : cat
          )
        );

      } catch (error) {
        console.error('Failed to fetch Shopify products:', error);
        setProductError(`Failed to load products: ${error.message}`);
        // Keep existing categories empty or clear them
        setCategories(prevCategories =>
          prevCategories.map(cat =>
            cat.productType === null
              ? { ...cat, items: [] }
              : cat
          )
        );
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProductsFromShopify();
  }, []); // Empty dependency array, runs once on mount

  // Handle escape key press to close modal
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        setSelectedProduct(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  // Prevent scrolling of the background when modal is open
  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedProduct]);

  const handleAddToCart = (product, variant) => { // Renamed and modified
    if (!variant) {
      console.error("Variant not found for product:", product.name);
      alert("Selected variant is not available.");
      return;
    }
    if (!variant.availableForSale) {
        alert(`${product.name} - ${variant.title} is currently not available.`);
        return;
    }
    addItemToCartContext(product, variant, 1); // Call context's addToCart
    alert(`${product.name} (Variant: ${variant.title}) added to cart!`);
  };

  const handleAuthAction = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Email and password are required.');
      return;
    }
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Sign up successful! Please check your email to confirm your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        alert('Sign in successful!');
      }
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Auth action error:', error.message);
      alert(`Error: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    alert('Signed out successfully.');
  };

  if (authLoading || isLoadingProducts) {
    return <div className="container text-center py-5"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div><p className="mt-2">Loading products...</p></div>;
  }

  // Display Auth Form if not logged in
  if (!user) {
    return (
      <div className="container" style={{ maxWidth: '480px', marginTop: '50px' }}>
        <div className="card shadow-sm">
          <div className="card-body p-4 p-md-5">
            <h2 className="card-title text-center mb-4">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
            <form onSubmit={handleAuthAction}>
              <div className="mb-3">
                <label htmlFor="emailInput" className="form-label">Email address</label> {/* Changed id to avoid conflict */}
                <input
                  type="email"
                  className="form-control form-control-lg"
                  id="emailInput"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                />
              </div>
              <div className="mb-3">
                <label htmlFor="passwordInput" className="form-label">Password</label> {/* Changed id to avoid conflict */}
                <input
                  type="password"
                  className="form-control form-control-lg"
                  id="passwordInput"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-100 mb-3">
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>
            <button onClick={() => setIsSignUp(!isSignUp)} className="btn btn-link w-100 text-center">
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is logged in, show products
  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <h1>Welcome, <span className="fw-normal">{user.email}</span></h1>
        <button onClick={handleSignOut} className="btn btn-danger">
          Sign Out
        </button>
      </div>

      {productError && <div className="alert alert-danger">{productError}</div>}

      {categories.map((category, index) => (
        <section key={index} className="mb-5">
          <h2 className="mb-4">{category.name}</h2>
          {category.items.length === 0 && !isLoadingProducts && <p className="text-muted">No products found in this category.</p>}
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {category.items.map((product) => {
              const firstVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
              const priceDisplay = firstVariant?.price?.amount
                ? `${firstVariant.price.currencyCode} ${firstVariant.price.amount.toFixed(2)}`
                : 'Price not available';
              const canAddToCart = firstVariant && firstVariant.availableForSale;

              return (
                <div key={product.id} className="col">
                  <div className="card h-100 shadow-sm">
                    <img
                      src={product.images[0] || '/placeholder-image.png'} // Assumes images is an array of URLs
                      alt={product.name}
                      className="card-img-top"
                      style={{ height: '250px', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => setSelectedProduct(product)} // selectedProduct will now be the mapped product structure
                    />
                    <div className="card-body d-flex flex-column">
                      <h5 className="card-title" style={{ cursor: 'pointer' }} onClick={() => setSelectedProduct(product)}>{product.name}</h5>
                      <p className="card-text small text-muted flex-grow-1">
                        {stripHtml(product.descriptionHtml || product.description || '').substring(0, 100)}...
                      </p>
                      <p className="fw-bold fs-5 mb-3">
                        {priceDisplay}
                      </p>
                      <div className="mt-auto d-grid gap-2 d-sm-flex">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="btn btn-outline-primary flex-sm-fill"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => firstVariant && handleAddToCart(product, firstVariant)} // Updated call
                          disabled={!canAddToCart}
                          className="btn btn-primary flex-sm-fill"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Product Modal - ensure it uses the mapped 'selectedProduct' structure */}
      {selectedProduct && (
        <div className="modal fade show" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selectedProduct.name}</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedProduct(null)} aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3 mb-md-0">
                    <img src={selectedProduct.images[0] || '/placeholder-image.png'} alt={selectedProduct.name} className="img-fluid rounded" style={{ maxHeight: '400px', objectFit: 'contain', width: '100%' }} />
                  </div>
                  <div className="col-md-6">
                    <p className="mb-3">{stripHtml(selectedProduct.descriptionHtml || selectedProduct.description || '')}</p>
                    {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                      <p className="fw-bold fs-4 mb-3">
                        {selectedProduct.variants[0].price.currencyCode} {selectedProduct.variants[0].price.amount.toFixed(2)}
                      </p>
                    )}
                    {/* You might want to add variant selection here if products have multiple variants */}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedProduct(null)}>Close</button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedProduct.variants && selectedProduct.variants.length > 0) {
                      const firstVariant = selectedProduct.variants[0];
                      handleAddToCart(selectedProduct, firstVariant); // Updated call
                    }
                    setSelectedProduct(null);
                  }}
                  disabled={!(selectedProduct.variants && selectedProduct.variants.length > 0 && selectedProduct.variants[0].availableForSale)}
                  className="btn btn-success"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to strip HTML (if you need it for descriptions)
function stripHtml(html) {
  if (typeof document !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  }
  return html; // Fallback for server-side or non-browser environments
}