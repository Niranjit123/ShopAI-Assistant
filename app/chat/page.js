'use client';

import { useState, useRef, useEffect } from 'react';
// import ChatInterface from '@/components/ChatInterface'; // Assuming this was refactored or removed based on previous steps
import ProductCard from '@/components/ProductCard';
import CartSidebar from '@/components/CartSidebar';
import ProductDetailsModal from '@/components/ProductDetailsModal';
import { useCart } from '../contexts/CartContext'; // Import useCart
import Image from 'next/image'; // For product images in modal or messages

// Helper function to strip HTML
function stripHtml(html) {
  if (typeof document !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  }
  return html.replace(/<[^>]*>?/gm, ''); 
}

export default function ChatPage() { // Renamed Home to ChatPage
  const { cartItems, addToCart: addItemToCartContext, getCartTotals } = useCart(); // Use CartContext

  const [messages, setMessages] = useState(() => {
    console.log('[ChatPage] Initializing messages state.');
    return [{ role: 'assistant', content: 'Hi! I\\\'m your shopping assistant. How can I help you today?' }];
  });
  const [input, setInput] = useState('');
  const [products, setProducts] = useState([]); // Products suggested by AI
  // const [cartData, setCartData] = useState({ items: [], total: 0, currencyCode: 'INR' }); // Removed local cart state
  const [isLoading, setIsLoading] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // For product grid modal
  const [selectedChatProduct, setSelectedChatProduct] = useState(null); // For product modal from chat message
  const [currentDetectedLang, setCurrentDetectedLang] = useState('en'); 
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const { totalItems: contextTotalItems, totalAmount: contextTotalAmount, currencyCode: contextCurrencyCode } = getCartTotals();


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAiTyping]);

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
  
  useEffect(() => {
    if (selectedProduct || selectedChatProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto'; // Changed from unset for consistency
    }
    return () => document.body.style.overflow = 'auto'; // Changed from unset
  }, [selectedProduct, selectedChatProduct]);

  const handleSendMessage = async (messageToSend) => {
    const userMessage = { role: 'user', content: messageToSend };
    
    // Log the history being sent
    console.log('[ChatPage] handleSendMessage: Current messages state (for history):', JSON.stringify(messages));
    const historyForAPI = messages.slice(-10);
    console.log('[ChatPage] handleSendMessage: History being sent to API:', JSON.stringify(historyForAPI));

    setMessages(prevMessages => {
      const newMessages = [...prevMessages, userMessage];
      console.log('[ChatPage] handleSendMessage: Updated messages state after adding user message:', JSON.stringify(newMessages));
      return newMessages;
    });
    setInput('');
    setIsAiTyping(true);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageToSend, 
          messageHistory: historyForAPI, // Changed 'history' to 'messageHistory'
          language: currentDetectedLang,
          currentProductContext: selectedChatProduct ? { name: selectedChatProduct.name, description: stripHtml(selectedChatProduct.descriptionHtml) } : null,
        }),
      });
      const data = await response.json();
      console.log('[ChatPage] handleSendMessage: Received API response data:', JSON.stringify(data));

      if (data.error) {
        const errorResponse = { role: 'assistant', content: `Error: ${data.error}` };
        console.log('[ChatPage] handleSendMessage: Adding error response to messages state:', JSON.stringify(errorResponse));
        setMessages(prevMessages => {
          const newMessages = [...prevMessages, errorResponse];
          console.log('[ChatPage] handleSendMessage: Updated messages state after adding error response:', JSON.stringify(newMessages));
          return newMessages;
        });
      } else {
        const assistantContent = data.reply || data.response || "Sorry, I couldn't understand that.";
        let assistantResponse = { 
          role: 'assistant', 
          content: assistantContent,
          products: data.products || data.metadata?.products,
          // Ensure other relevant fields from `data` are included if needed by the UI
        };
        
        if (data.detectedLang) {
            setCurrentDetectedLang(data.detectedLang);
        }
        
        // Simplified product processing for logging clarity, ensure your original logic is sound
        if (assistantResponse.products && assistantResponse.products.length > 0) {
          console.log('[ChatPage] handleSendMessage: Assistant response includes products.');
          // Your existing product processing logic here...
        }
        
        if (data.action === 'add_to_cart' && data.product_id && data.variant_id) {
          // Your existing add_to_cart logic...
          // Ensure assistantResponse.content is updated appropriately
          console.log('[ChatPage] handleSendMessage: Action add_to_cart detected.');
        }

        console.log('[ChatPage] handleSendMessage: Adding assistant success response to messages state:', JSON.stringify(assistantResponse));
        setMessages(prevMessages => {
          const newMessages = [...prevMessages, assistantResponse];
          console.log('[ChatPage] handleSendMessage: Updated messages state after adding assistant success response:', JSON.stringify(newMessages));
          return newMessages;
        });
      }
    } catch (error) {
      console.error('[ChatPage] handleSendMessage: Failed to send message or process response:', error);
      const catchErrorResponse = { role: 'assistant', content: 'Sorry, I couldn\\\'t connect. Please try again.' };
      console.log('[ChatPage] handleSendMessage: Adding catch block error response to messages state:', JSON.stringify(catchErrorResponse));
      setMessages(prevMessages => {
        const newMessages = [...prevMessages, catchErrorResponse];
        console.log('[ChatPage] handleSendMessage: Updated messages state after catch block error:', JSON.stringify(newMessages));
        return newMessages;
      });
    } finally {
      setIsAiTyping(false);
      setIsLoading(false);
    }
  };
  
  const handleInputSubmit = (e) => {
    e.preventDefault();
    const currentInput = input.trim();
    if (currentInput) {
      handleSendMessage(currentInput);
    }
  };

  // Updated addToCart to use CartContext
  const handleAddToCart = (product, variant) => {
    if (!product || !variant) {
      console.error('Product or variant details are missing for cart addition.');
      alert('Could not add item to cart. Essential details are missing.');
      return;
    }
    if (!variant.availableForSale) {
      alert(`${product.name} (${variant.title}) is currently not available.`);
      return;
    }
    addItemToCartContext(product, variant, 1); // Use context's addToCart
    alert(`${product.name} (Variant: ${variant.title}) added to cart!`);
    // Optionally close modals
    if (selectedProduct && selectedProduct.id === product.id) setSelectedProduct(null);
    if (selectedChatProduct && selectedChatProduct.id === product.id) setSelectedChatProduct(null);
  };


  return (
    <div className="container-fluid vh-100 d-flex flex-column p-0">
      <header className="bg-light p-3 d-flex align-items-center border-bottom shadow-sm">
        <h1 className="h5 mb-0 me-auto">E-commerce Chat</h1>
        <div className="cart-summary">
          <i className="bi bi-cart-fill me-1"></i>
          {/* Use data from CartContext */}
          <span>Cart: {contextTotalItems} item{contextTotalItems !== 1 ? 's' : ''}</span> 
          {contextTotalAmount > 0 && (
            <span className="ms-2">
              Total: {parseFloat(contextTotalAmount).toFixed(2)} {contextCurrencyCode}
            </span>
          )}
        </div>
      </header>

      <div className="row flex-grow-1 p-0 m-0">
        <div className="col-lg-8 d-flex flex-column p-3">
          {/* Chat Messages Area - Adapted from previous chat page structure */}
          <div 
            ref={chatContainerRef} 
            className="chat-messages-area flex-grow-1 mb-3" 
            style={{ overflowY: 'auto', minHeight: '300px', border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}
          >
            {messages.map((msg, index) => (
              <div key={index} className={`d-flex ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'} mb-3`}>
                <div 
                  className={`p-2 rounded shadow-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white border'}`}
                  style={{ maxWidth: '75%' }}
                >
                  <p className="mb-1" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
                  {msg.role === 'assistant' && msg.products && msg.products.length > 0 && (
                    <div className="mt-2">
                      <p className="fw-bold small">Suggested Products:</p>
                      {msg.products.map((product, pIndex) => (
                        <div key={pIndex} className="card mb-2">
                          <div className="card-body p-2">
                            <div className="d-flex">
                              {product.images && product.images[0] && (
                                <Image src={product.images[0]} alt={product.name} width={50} height={50} className="rounded me-2" style={{objectFit: 'cover'}}/>
                              )}
                              <div className="flex-grow-1">
                                <h6 className="card-title small mb-0">{product.name}</h6>
                                {product.variants && product.variants[0] && product.variants[0].price && typeof product.variants[0].price.amount !== 'undefined' && (
                                    <p className="card-text small text-muted mb-1">
                                        {product.variants[0].price.currencyCode} {parseFloat(product.variants[0].price.amount).toFixed(2)}
                                    </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-1 d-flex justify-content-end">
                                <button 
                                    className="btn btn-sm btn-outline-secondary me-1"
                                    onClick={() => setSelectedChatProduct(product)}
                                >
                                    Details
                                </button>
                                <button 
                                    className="btn btn-sm btn-success"
                                    onClick={() => product.variants && product.variants[0] && handleAddToCart(product, product.variants[0])}
                                    disabled={!(product.variants && product.variants[0] && product.variants[0].availableForSale)}
                                >
                                    Add to Cart
                                </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isAiTyping && (
              <div className="d-flex justify-content-start mb-3">
                <div className="p-2 rounded shadow-sm bg-white border typing-indicator-container" style={{ maxWidth: '75%' }}>
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
                disabled={isLoading}
              />
              <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <i className="bi bi-send"></i>
                )}
              </button>
            </div>
          </form>

          {/* Product Results Section - for general AI suggested products */}
          {products.length > 0 && !messages.some(m => m.products) && ( // Only show if not already in a message
            <section className="product-results-section mt-4">
              <h4 className="mb-3 fw-bold">
                <i className="bi bi-grid-3x3-gap-fill me-2 text-primary"></i>
                Recommended Products
              </h4>
              <div className="row row-cols-1 row-cols-sm-2 row-cols-md-2 row-cols-xl-3 g-4 product-grid-spacing">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product} // Ensure ProductCard expects this structure
                    onAddToCart={(variantId) => handleAddToCart(product, product.variants.find(v => v.id === variantId) || product.variants[0])}
                    onViewDetails={() => setSelectedProduct(product)} // Assuming ProductCard has onViewDetails
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="col-lg-4 p-3 border-start">
          <div className="sticky-top" style={{ top: '20px' }}>
            <CartSidebar 
              cart={cartItems} // Use cartItems from CartContext
              total={contextTotalAmount} // Use totalAmount from CartContext
              currencyCode={contextCurrencyCode} // Use currencyCode from CartContext
              // onCheckout and onViewCart props can be added if needed
              onViewCart={() => window.location.href = '/cart'} // Example: navigate to cart page
            />
            <div className="card mt-4 shadow-sm">
              <div className="card-header bg-white border-bottom">
                <h6 className="mb-0 d-flex align-items-center">
                  <i className="bi bi-lightning-charge-fill me-2 text-warning"></i>
                  Quick Actions
                </h6>
              </div>
              <div className="card-body d-grid gap-2">
                <button className="btn btn-outline-primary btn-sm" onClick={() => handleSendMessage('Show me trending products')} disabled={isLoading}>Trending Products</button>
                <button className="btn btn-outline-success btn-sm" onClick={() => handleSendMessage('Are there any sale items?')} disabled={isLoading}>Sale Items</button>
                <button className="btn btn-outline-info btn-sm" onClick={() => handleSendMessage('Suggest some gift ideas')} disabled={isLoading}>Gift Ideas</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(variantId) => handleAddToCart(selectedProduct, selectedProduct.variants.find(v => v.id === variantId) || selectedProduct.variants[0])}
        />
      )}
      {selectedChatProduct && (
         <ProductDetailsModal
           product={selectedChatProduct}
           onClose={() => setSelectedChatProduct(null)}
           onAddToCart={(variantId) => handleAddToCart(selectedChatProduct, selectedChatProduct.variants.find(v => v.id === variantId) || selectedChatProduct.variants[0])}
         />
      )}
       <style jsx global>{`
        .typing-indicator {
          display: flex;
          padding: 5px;
        }
        .typing-indicator span {
          height: 8px;
          width: 8px;
          float: left;
          margin: 0 1px;
          background-color: #9E9EA1;
          display: block;
          border-radius: 50%;
          opacity: 0.4;
          animation: typing 1s infinite alternate;
        }
        .typing-indicator span:nth-of-type(1) {
          animation-delay: 0s;
        }
        .typing-indicator span:nth-of-type(2) {
          animation-delay: 0.2s;
        }
        .typing-indicator span:nth-of-type(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing {
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}