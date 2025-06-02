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
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        content: data.response
      };

      // If products are returned, add them as images to the message
      if (data.metadata?.chatImages && data.metadata.chatImages.length > 0) {
        console.log('🖼️ Adding chat images to message:', data.metadata.chatImages);
        assistantMessage.images = data.metadata.chatImages;
      } else if (data.products && data.products.length > 0) {
        // Fallback: create images from products if chatImages not provided
        console.log('🔄 Creating fallback images from products');
        const productImages = data.products
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
        }
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
            <div className="mt-4">
              <div className="card shadow-sm">
                <div className="card-header bg-white border-bottom py-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <h5 className="mb-0 d-flex align-items-center">
                      <i className="bi bi-grid me-2 text-primary"></i>
                      Product Results
                      <span className="badge bg-primary ms-2">{products.length}</span>
                    </h5>
                    <div className="btn-group btn-group-sm" role="group">
                      <button type="button" className="btn btn-outline-secondary">
                        <i className="bi bi-grid-3x3-gap"></i>
                      </button>
                      <button type="button" className="btn btn-outline-secondary">
                        <i className="bi bi-list"></i>
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <small className="text-muted">
                      Showing {products.length} result{products.length !== 1 ? 's' : ''} • 
                      Sorted by relevance
                    </small>
                  </div>
                </div>
                <div className="card-body p-4">
                  {/* Products Grid with Better Spacing */}
                  <div className="row g-4">
                    {products.map((product, index) => (
                      <div key={product.id || index} className="col-12 col-sm-6 col-lg-4">
                        <ProductCard 
                          product={product} 
                          onAddToCart={(variantId) => addToCart(product.id, variantId)} 
                        />
                      </div>
                    ))}
                  </div>
                  
                  {/* Load More Button */}
                  {products.length >= 6 && (
                    <div className="text-center mt-4 pt-4 border-top">
                      <button 
                        className="btn btn-outline-primary btn-lg"
                        onClick={() => handleSendMessage('Show me more similar products')}
                        disabled={isLoading}
                      >
                        <i className="bi bi-arrow-down-circle me-2"></i>
                        Load More Products
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
    </div>
  );
}