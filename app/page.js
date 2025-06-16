'use client';

import { useState, useRef, useEffect } from 'react';
import ChatInterface from '@/components/ChatInterface';
import ProductCard from '@/components/ProductCard';
import CartSidebar from '@/components/CartSidebar';
import ProductDetailsModal from '@/components/ProductDetailsModal';

// Helper function to strip HTML
function stripHtml(html) {
  if (typeof document !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  }
  return html.replace(/<[^>]*>?/gm, ''); 
}

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your shopping assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [products, setProducts] = useState([]);
  const [cartData, setCartData] = useState({ items: [], total: 0, currencyCode: 'INR' }); 
  const [isLoading, setIsLoading] = useState(false); // General loading for API calls
  const [isAiTyping, setIsAiTyping] = useState(false); // Specific state for AI typing indicator
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedChatProduct, setSelectedChatProduct] = useState(null);
  const [currentDetectedLang, setCurrentDetectedLang] = useState('en'); 
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when new messages or typing indicator appears/disappears
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAiTyping]); // Ensure isAiTyping is a dependency

  // Handle escape key press to close modal
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        if(selectedProduct) setSelectedProduct(null);
        if(selectedChatProduct) setSelectedChatProduct(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedProduct, selectedChatProduct]);
  
  // Prevent scrolling of the background when modal is open
  useEffect(() => {
    if (selectedProduct || selectedChatProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => document.body.style.overflow = 'unset';
  }, [selectedProduct, selectedChatProduct]);

  const handleSendMessage = async (messageToSend) => {
    const userMessage = { role: 'user', content: messageToSend };
    // Add user message and immediately set AI typing to true
    setMessages(prev => [...prev, userMessage]);
    setIsAiTyping(true); // AI starts "typing"
    setIsLoading(true); // Also set general loading for the API call duration

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageToSend, 
          history: messages.slice(-10), 
          language: currentDetectedLang 
        }),
      });
      const data = await response.json();

      // AI is no longer "typing" once a response (or error) is received
      // but before processing the response, so the indicator disappears before new message appears
      // We will set it to false in the finally block to ensure it's always reset.

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      } else {
        const assistantMessage = { role: 'assistant', content: data.response };
        if (data.metadata?.products && data.metadata.products.length > 0) {
          const processedProducts = data.metadata.products.map(p => ({
            ...p,
            description: stripHtml(p.descriptionHtml || p.description || ''),
            image: (p.images?.edges?.[0]?.node) || p.image || null,
          }));
          setProducts(processedProducts);
        }
        // Add assistant message AFTER AI typing indicator is handled (in finally)
        // This ensures the indicator is shown while waiting.
        // We will add the message after the finally block sets isAiTyping to false.
        // For now, just prepare it.
        // setMessages(prev => [...prev, assistantMessage]); // Moved to finally for better UX
        
        if (data.metadata?.cartUpdate) {
          setCartData({ 
            items: data.metadata.cartUpdate.cart, 
            total: data.metadata.cartUpdate.total,
            currencyCode: data.metadata.cartUpdate.currencyCode || 'INR' 
          });
        }
        if (data.metadata?.detectedLang) {
          setCurrentDetectedLang(data.metadata.detectedLang);
        }
        // Add assistant message here, after processing other metadata
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t connect. Please try again.' }]);
    } finally {
      setIsAiTyping(false); // AI stops "typing"
      setIsLoading(false); // General loading finished
    }
  };
  
  const handleInputSubmit = (e) => {
    e.preventDefault();
    const currentInput = input.trim();
    if (currentInput) {
      setInput(''); 
      handleSendMessage(currentInput);
    }
  };

  const addToCart = async (productId, variantId) => {
    const product = products.find(p => p.id === productId) || selectedProduct || selectedChatProduct;
    let defaultVariantId = variantId;

    if (!defaultVariantId && product && product.variants && product.variants.length > 0) {
        const firstValidVariant = product.variants.find(v => v.id && typeof v.id === 'string' && v.id.includes('ProductVariant'));
        if (firstValidVariant) defaultVariantId = firstValidVariant.id;
    }
    
    if (!defaultVariantId) {
        setMessages(prev => [...prev, {role: 'assistant', content: `Sorry, I could not add ${product?.title || 'the item'} to the cart. Variant information is missing.`}]);
        return;
    }

    setIsLoading(true); // Use general isLoading for cart operation

    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId: defaultVariantId, quantity: 1 }),
      });
      const data = await response.json();

      if (data.success) {
        setCartData({ items: data.cart, total: data.total, currencyCode: data.currencyCode || 'INR' });
        setMessages(prev => [...prev, {role: 'assistant', content: `${data.product?.title || 'Item'} has been added to your cart.`}]);
        if (selectedProduct) setSelectedProduct(null);
        if (selectedChatProduct) setSelectedChatProduct(null);
      } else {
        setMessages(prev => [...prev, {role: 'assistant', content: `Sorry, there was an error adding to cart: ${data.error}`}]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {role: 'assistant', content: 'An unexpected error occurred while adding to cart.'}]);
    } finally {
      setIsLoading(false); // Reset general loading
    }
  };


  return (
    <div className="container-fluid vh-100 d-flex flex-column p-0">
      {/* Header */}
      <header className="bg-light p-3 d-flex align-items-center border-bottom shadow-sm">
        <h1 className="h5 mb-0 me-auto">E-commerce Chat</h1>
        <div className="cart-summary">
          <i className="bi bi-cart-fill me-1"></i>
          <span>Cart: {cartData.items.length} items</span> 
          {cartData.total > 0 && (
            <span className="ms-2">
              Total: {parseFloat(cartData.total).toFixed(2)} {cartData.currencyCode}
            </span>
          )}
        </div>
      </header>

      <div className="row flex-grow-1 p-0 m-0">
        <div className="col-lg-8 d-flex flex-column p-3">
          <div 
            ref={chatContainerRef} 
            className="chat-messages-area flex-grow-1 mb-3" 
            style={{ overflowY: 'auto', minHeight: '300px', border: '1px solid #eee', borderRadius: '8px', padding: '1rem', listStyleType: 'none' }}
          >
            {messages.map((msg, index) => (
              <div key={index} className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                <div 
                  className={`p-3 rounded shadow-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white border'}`}
                  style={{ maxWidth: '75%' }}
                >
                  {msg.role === 'assistant' ? msg.content.replace(/\*\*/g, '') : msg.content}
                </div>
              </div>
            ))}
            {/* AI Typing Indicator - Rendered based on isAiTyping state */}
            {isAiTyping && (
              <div className="d-flex mb-3 justify-content-start">
                <div className="p-3 rounded shadow-sm bg-white border typing-indicator-container" style={{ maxWidth: '75%' }}>
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleInputSubmit} className="chat-input-form mt-auto p-3 bg-light border-top rounded-bottom">
            <div className="input-group">
              <input
                type="text"
                className="form-control form-control-lg"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading} // Disable input if general loading is true
              />
              <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading || !input.trim()}>
                {/* Show spinner if isLoading is true AND isAiTyping is false (i.e., not the AI's turn but some other loading) */}
                {/* Or, more simply, just disable if isLoading. The AI typing is a visual cue, not a functional block for the button. */}
                {isLoading && !isAiTyping ? ( // Show spinner for general loading if AI is not "typing"
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <i className="bi bi-send"></i>
                )}
              </button>
            </div>
          </form>

          {/* Product Results Section */}
          {products.length > 0 && (
            <section className="product-results-section mt-4">
              <h4 className="mb-3 fw-bold">
                <i className="bi bi-grid-3x3-gap-fill me-2 text-primary"></i>
                Recommendated Products
              </h4>
              <div className="row row-cols-1 row-cols-sm-2 row-cols-md-2 row-cols-xl-3 g-4 product-grid-spacing">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={(variantId) => addToCart(product.id, variantId)}
                    selectedProduct={selectedProduct}
                    setSelectedProduct={setSelectedProduct}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="col-lg-4 p-3 border-start">
          <div className="sticky-top" style={{ top: '20px' }}>
            <CartSidebar 
              cart={cartData.items} 
              total={cartData.total} 
              currencyCode={cartData.currencyCode} // This will be used by CartSidebar (but it internally forces INR for display)
            />
            <div className="card mt-4 shadow-sm">
              <div className="card-header bg-white border-bottom">
                <h6 className="mb-0 d-flex align-items-center">
                  <i className="bi bi-lightning-charge-fill me-2 text-warning"></i>
                  Quick Actions
                </h6>
              </div>
              <div className="card-body d-grid gap-2">
                <button className="btn btn-outline-primary btn-sm" onClick={() => {setInput(''); handleSendMessage('Show me trending products')}} disabled={isLoading}>Trending Products</button>
                <button className="btn btn-outline-success btn-sm" onClick={() => {setInput(''); handleSendMessage('Are there any sale items?')}} disabled={isLoading}>Sale Items</button>
                <button className="btn btn-outline-info btn-sm" onClick={() => {setInput(''); handleSendMessage('Suggest some gift ideas')}} disabled={isLoading}>Gift Ideas</button>
                <button className="btn btn-outline-warning btn-sm" onClick={() => {setInput(''); handleSendMessage('Show me shoes')}} disabled={isLoading}>Shoes</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Modals */}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(variantId) => addToCart(selectedProduct.id, variantId)}
        />
      )}
      {selectedChatProduct && (
         <ProductDetailsModal
           product={selectedChatProduct}
           onClose={() => setSelectedChatProduct(null)}
           onAddToCart={(variantId) => addToCart(selectedChatProduct.id, variantId)}
         />
      )}
    </div>
  );
}