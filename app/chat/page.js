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

  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your shopping assistant. How can I help you today?' }
  ]);
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
    setMessages(prev => [...prev, userMessage]);
    setInput(''); // Clear input after sending
    setIsAiTyping(true);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageToSend, 
          history: messages.slice(-10), 
          language: currentDetectedLang,
          currentProductContext: selectedChatProduct ? { name: selectedChatProduct.name, description: stripHtml(selectedChatProduct.descriptionHtml) } : null,
        }),
      });
      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      } else {
        let assistantResponse = { role: 'assistant', content: data.reply || data.response }; // Accommodate both 'reply' and 'response'
        
        if (data.detectedLang) {
            setCurrentDetectedLang(data.detectedLang);
        }
        
        const aiSuggestedProducts = data.products || data.metadata?.products;
        if (aiSuggestedProducts && aiSuggestedProducts.length > 0) {
          const getSafePrice = (priceInput, generalCurrencyCode) => {
            let amount = 0;
            let currencyCode = generalCurrencyCode || 'INR';

            if (typeof priceInput === 'object' && priceInput !== null && priceInput.amount !== undefined) {
              amount = parseFloat(priceInput.amount);
              currencyCode = priceInput.currencyCode || currencyCode;
            } else if (priceInput !== undefined && priceInput !== null && typeof priceInput !== 'object') {
              amount = parseFloat(priceInput);
              // currencyCode remains generalCurrencyCode or INR if priceInput is just a number/string
            }
            return { amount: isNaN(amount) ? 0 : amount, currencyCode };
          };

          const processedProducts = aiSuggestedProducts.map((p, productIndex) => {
            const baseProductId = p.id || p.productId || `product_${productIndex}`;
            const productCurrency = p.currencyCode || 'INR';

            const mappedVariants = (p.variants && p.variants.length > 0)
              ? p.variants.map((v, variantIndex) => ({
                  id: v.id || v.variantId || `${baseProductId}_v${variantIndex}`,
                  title: v.title || v.variantTitle || 'Default Variant',
                  price: getSafePrice(v.price, v.currencyCode || productCurrency),
                  availableForSale: v.availableForSale !== undefined ? v.availableForSale : true,
                }))
              : [{ // Fallback if p.variants is empty or doesn't exist
                  id: p.variantId || `${baseProductId}_v0`,
                  title: p.variantTitle || 'Default Variant',
                  price: getSafePrice(p.price, productCurrency), // Use p.price for the fallback variant
                  availableForSale: p.availableForSale !== undefined ? p.availableForSale : true,
                }];

            return {
              ...p,
              id: baseProductId,
              name: p.name || p.title || 'Unnamed Product',
              images: p.images || (p.image ? [p.image.url || p.image] : ['/placeholder-image.png']),
              variants: mappedVariants,
              descriptionHtml: p.descriptionHtml || p.description || '',
              description: stripHtml(p.descriptionHtml || p.description || ''),
              image: (p.images?.edges?.[0]?.node) || p.image || (p.images && p.images[0]) || null,
            };
          });
          
          assistantResponse.products = processedProducts; 
          setProducts(processedProducts); 
        }
        
        if (data.action === 'add_to_cart' && data.product_id && data.variant_id) {
            const productDataForCart = (assistantResponse.products || products).find(p => p.id === data.product_id);
            if (productDataForCart) {
                const variantDataForCart = productDataForCart.variants.find(v => v.id === data.variant_id);
                if (variantDataForCart) {
                    handleAddToCart(productDataForCart, variantDataForCart);
                    assistantResponse.content = `I've added ${productDataForCart.name} (${variantDataForCart.title}) to your cart. ${assistantResponse.content || ''}`;
                }
            }
        }
        setMessages(prev => [...prev, assistantResponse]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t connect. Please try again.' }]);
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
                                {product.variants && product.variants[0] && (
                                    <p className="card-text small text-muted mb-1">
                                        {product.variants[0].price.currencyCode} {product.variants[0].price.amount.toFixed(2)}
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