'use client';

import { useState, useRef, useEffect } from 'react';
import ChatInterface from '@/components/ChatInterface';
import ProductCard from '@/components/ProductCard';
import CartSidebar from '@/components/CartSidebar';

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your shopping assistant. How can I help you today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle escape key press to close modal
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && selectedProduct) {
        setSelectedProduct(null);
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [selectedProduct]);
  
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

  const handleSendMessage = async (message) => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsLoading(true);
    
    try {
      console.log('📤 Sending message to API:', message);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, messageHistory: messages })
      });
      
      const data = await response.json();
      console.log('📥 Received API response:', data);
      
      // Process the response to include images if products are returned
      let assistantMessage = {
        role: 'assistant',
        content: data.response,
        images: [] // Always initialize as empty array
      };

      // If products are returned, add them as images to the message
      if (data.metadata?.chatImages && data.metadata.chatImages.length > 0) {
        console.log('🖼️ Adding chat images to message:', data.metadata.chatImages);
        assistantMessage.images = data.metadata.chatImages;
      } else if (data.products && data.products.length > 0) {
        // Map Shopify's featuredImage to product.image for downstream rendering
        const normalizedProducts = data.products.map(product => ({
          ...product,
          image: product.image || (product.featuredImage ? { url: product.featuredImage.url, alt: product.title } : undefined)
        }));
        // Fallback: create images from products if chatImages not provided
        console.log('🔄 Creating fallback images from products');
        const productImages = normalizedProducts
          .filter(product => {
            const hasImage = product.image?.url;
            if (!hasImage) {
              console.log(`⚠️ Product ${product.title} has no image URL`);
            }
            return hasImage;
          })
          .slice(0, 6)
          .map(product => ({
            url: product.image.url,
            alt: product.title || 'Product',
            title: product.title,
            price: product.priceRange?.minVariantPrice?.amount || product.price
          }));
        
        if (productImages.length > 0) {
          console.log('✅ Created product images for chat:', productImages);
          assistantMessage.images = productImages;
        } else {
          // Explicitly set images to [] if no images found
          assistantMessage.images = [];
        }
        // Update products state with normalized products (with image field)
        setProducts(normalizedProducts);
      } else {
        // Explicitly set images to [] if no images found
        assistantMessage.images = [];
      }
      
      // Debug: Log images array before updating messages
      if (!assistantMessage.images || assistantMessage.images.length === 0) {
        console.warn('[Chat Debug] No images found for assistant message:', assistantMessage);
        // Optionally, add a placeholder image or indicator for debugging
        assistantMessage.noImages = true;
      }
      setMessages(prev => [...prev, assistantMessage]);
      
      if (data.products && data.products.length > 0) {
        console.log(`📦 Setting ${data.products.length} products for display`);
        setProducts(data.products);
      } else {
        console.log('❌ No products in response');
        // Clear products if no new ones
        setProducts([]);
      }
      
      if (data.cartUpdate) {
        setCart(data.cartUpdate.cart);
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (productId, variantId) => {
    console.log('🛒 Adding to cart:', { productId, variantId });
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId, quantity: 1 })
      });
      const data = await response.json();
      setCart(data.cart);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Added ${data.product.title} to your cart! 🛒` 
      }]);
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I couldn\'t add that item to your cart. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 200px)' }}>
      <div className="row g-4">
        {/* Main Chat Area */}
        <div className="col-lg-8">
          <ChatInterface 
            messages={messages} 
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
          />
          
          {/* Product Results Section */}
          {products.length > 0 && (
            <section className="mt-4">
              <h4 className="mb-3 fw-bold">
                <i className="bi bi-grid me-2 text-primary"></i>
                Product Results
                <span className="badge bg-primary ms-2">{products.length}</span>
              </h4>
              <div className="row g-5">
                {products.map((product, index) => (
                  <div key={product.id || index} className="col-12 col-sm-6 col-lg-4 mb-4">
                    <div className="h-100">
                      <div 
                        className="card shadow h-100 border-0 transition-hover" 
                        style={{ 
                          maxWidth: '100%', 
                          borderRadius: '12px',
                          overflow: 'hidden',
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedProduct(product)}
                      >
                        <div className="position-relative">
                          {product.image && product.image.url ? (
                            <img
                              src={product.image.url}
                              alt={product.image.alt || product.title}
                              className="card-img-top"
                              style={{ 
                                objectFit: 'cover', 
                                height: '220px', 
                                width: '100%',
                              }}
                            />
                          ) : (
                            <div className="d-flex align-items-center justify-content-center bg-light" style={{ height: '220px', width: '100%' }}>
                              <i className="bi bi-image text-muted" style={{ fontSize: '3rem' }}></i>
                            </div>
                          )}
                        </div>
                        <div className="card-body d-flex flex-column p-4">
                          <h5 className="fw-bold mb-2" style={{ fontSize: '1.15rem', minHeight: '2.5rem', lineHeight: '1.3' }}>{product.title}</h5>
                          <div className="mb-3">
                            <span className="text-success fw-bold" style={{ fontSize: '1.2rem' }}>
                              {product.priceRange?.minVariantPrice?.amount || product.price || '0.00'} {product.priceRange?.minVariantPrice?.currencyCode || ''}
                            </span>
                          </div>
                          <p className="text-muted small mb-3" style={{ minHeight: '3.5rem', lineHeight: '1.5' }}>
                            {product.description || 'No description available.'}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent the card click event
                              addToCart(product.id, product.variants && product.variants.length > 0 ? product.variants[0].id : product.id);
                            }}
                            className="btn btn-primary mt-auto w-100"
                            style={{ borderRadius: '8px' }}
                          >
                            <i className="bi bi-cart-plus me-2"></i>
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="col-lg-4">
          <div className="sticky-top" style={{ top: '20px' }}>
            <CartSidebar cart={cart} />
            
            {/* Quick Actions Card */}
            <div className="card mt-4 shadow-sm">
              <div className="card-header bg-white border-bottom">
                <h6 className="mb-0 d-flex align-items-center">
                  <i className="bi bi-lightning me-2 text-warning"></i>
                  Quick Actions
                </h6>
              </div>
              <div className="card-body p-3">
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => handleSendMessage('Show me trending products')}
                    disabled={isLoading}
                  >
                    <i className="bi bi-fire me-1"></i>
                    Trending Products
                  </button>
                  <button 
                    className="btn btn-outline-success btn-sm"
                    onClick={() => handleSendMessage('Show me sale items')}
                    disabled={isLoading}
                  >
                    <i className="bi bi-tag me-1"></i>
                    Sale Items
                  </button>
                  <button 
                    className="btn btn-outline-info btn-sm"
                    onClick={() => handleSendMessage('I need help choosing a gift')}
                    disabled={isLoading}
                  >
                    <i className="bi bi-gift me-1"></i>
                    Gift Ideas
                  </button>
                  <button 
                    className="btn btn-outline-warning btn-sm"
                    onClick={() => handleSendMessage('Show me shoes')}
                    disabled={isLoading}
                  >
                    <i className="bi bi-shoe me-1"></i>
                    Shoes
                  </button>
                </div>
              </div>
            </div>
            
            {/* Active Filters */}
            {products.length > 0 && (
              <div className="card mt-4 shadow-sm">
                <div className="card-header bg-white border-bottom">
                  <h6 className="mb-0 d-flex align-items-center">
                    <i className="bi bi-funnel me-2 text-info"></i>
                    Filters & Sort
                  </h6>
                </div>
                <div className="card-body p-3">
                  <div className="d-grid gap-2">
                    <button className="btn btn-outline-secondary btn-sm">
                      <i className="bi bi-currency-dollar me-1"></i>
                      Price: Low to High
                    </button>
                    <button className="btn btn-outline-secondary btn-sm">
                      <i className="bi bi-star me-1"></i>
                      Best Rated
                    </button>
                    <button className="btn btn-outline-secondary btn-sm">
                      <i className="bi bi-clock me-1"></i>
                      Newest First
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div 
          className="modal-backdrop" 
          onClick={() => setSelectedProduct(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1050,
            padding: '1rem'
          }}
        >
          <div 
            className="modal-content bg-white" 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '800px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div 
              className="modal-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #dee2e6'
              }}
            >
              <h5 className="modal-title">{selectedProduct.title}</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setSelectedProduct(null)}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div className="row">
                <div className="col-md-6">
                  {selectedProduct.image && selectedProduct.image.url ? (
                    <img
                      src={selectedProduct.image.url}
                      alt={selectedProduct.image.alt || selectedProduct.title}
                      className="img-fluid rounded"
                      style={{ 
                        width: '100%', 
                        height: 'auto', 
                        maxHeight: '400px', 
                        objectFit: 'contain' 
                      }}
                    />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center bg-light rounded" style={{ height: '300px', width: '100%' }}>
                      <i className="bi bi-image text-muted" style={{ fontSize: '3rem' }}></i>
                    </div>
                  )}
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <span className="text-success fw-bold fs-4">
                      {selectedProduct.priceRange?.minVariantPrice?.amount || selectedProduct.price || '0.00'} 
                      {selectedProduct.priceRange?.minVariantPrice?.currencyCode || ''}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <h6 className="fw-bold mb-2">Description</h6>
                    <p>{selectedProduct.description || 'No description available.'}</p>
                  </div>
                  
                  {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                    <div className="mb-4">
                      <h6 className="fw-bold mb-2">Variants</h6>
                      <div className="d-flex flex-wrap gap-2">
                        {selectedProduct.variants.map((variant) => (
                          <div key={variant.id} className="badge bg-light text-dark p-2">
                            {variant.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                    <div className="mb-4">
                      <h6 className="fw-bold mb-2">Tags</h6>
                      <div className="d-flex flex-wrap gap-2">
                        {selectedProduct.tags.map((tag, index) => (
                          <span key={index} className="badge bg-secondary p-2">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      const defaultVariantId = selectedProduct.variants && selectedProduct.variants.length > 0 
                        ? selectedProduct.variants[0].id 
                        : selectedProduct.id;
                      addToCart(selectedProduct.id, defaultVariantId);
                      setSelectedProduct(null); // Close modal after adding to cart
                    }}
                    className="btn btn-primary w-100"
                  >
                    <i className="bi bi-cart-plus me-2"></i>
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}