'use client';

import { useState, useEffect } from 'react';

export default function ChatInterface({ messages, onSendMessage, isLoading, messagesEndRef, onChatProductCardClick }) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    // Pass the current messages array as the history to the parent handler
    onSendMessage(inputValue, messages); 
    setInputValue('');
  };

  const renderMessageContent = (message) => {
    if (message.role === 'assistant' && message.isProductResponse && message.images && message.images.length > 0) {
      const productsToShow = message.images;

      return (
        <div>
          {message.content && <div className="mb-3">{message.content}</div>}
          
          <div className="row g-3">
            {productsToShow.map((product, index) => (
              <div key={product.id || index} className="col-12">
                <div 
                  className="card shadow-sm" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => onChatProductCardClick(product.id)} // Call handler with product ID
                >
                  <div className="row g-0">
                    <div className="col-4 col-sm-3">
                      {product.url && (
                        <img
                          src={product.url}
                          alt={product.alt || product.title}
                          className="img-fluid rounded-start w-100"
                          style={{ 
                            height: '120px',
                            objectFit: 'cover',
                            // Removed direct onClick for image to avoid conflict with card click
                            // The card click will handle opening the modal.
                          }}
                        />
                      )}
                      {!product.url && (
                        <div className="d-flex align-items-center justify-content-center bg-light rounded-start" style={{ height: '120px', width: '100%' }}>
                          <i className="bi bi-image text-muted" style={{ fontSize: '2rem' }}></i>
                        </div>
                      )}
                    </div>
                    <div className="col-8 col-sm-9">
                      <div className="card-body p-2 p-sm-3">
                        <h6 className="card-title fw-bold mb-1" style={{ fontSize: '0.9rem' }}>
                          {product.title || 'Product'}
                        </h6>
                        <p className="card-text small text-muted mb-1" style={{ maxHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8rem' }}>
                          {product.description || 'No description available.'}
                        </p>
                        {product.price && (
                          <p className="card-text fw-semibold text-success mb-0" style={{ fontSize: '0.85rem' }}>
                            ${parseFloat(product.price).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Button to search for more similar items */}
          {productsToShow.length > 0 && (
            <div className="mt-3">
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => {
                  const firstProductTitle = productsToShow[0]?.title;
                  if (firstProductTitle) {
                    onSendMessage(`Find more items similar to ${firstProductTitle}`);
                  } else {
                    onSendMessage('Search for more similar items');
                  }
                }}
                disabled={isLoading}
              >
                <i className="bi bi-search me-1"></i> Search for more similar items
              </button>
            </div>
          )}
        </div>
      );
    }
    
    // Fallback for original image display (non-product specific images)
    if (message.role === 'assistant' && message.images && message.images.length > 0 && !message.isProductResponse) {
      return (
        <div>
          {message.content && <div className="mb-3">{message.content}</div>}
          <div className="row g-2">
            {message.images.map((image, index) => (
              <div key={index} className="col-6 col-md-4">
                <div className="card border-0 shadow-sm">
                  <img
                    src={image.url}
                    alt={image.alt || `Product ${index + 1}`}
                    className="card-img-top rounded"
                    style={{ 
                      height: '120px', 
                      objectFit: 'cover',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    onClick={() => {
                      window.open(image.url, '_blank');
                    }}
                  />
                  {image.title && (
                    <div className="card-body p-2">
                      <p className="card-text small text-muted mb-0">{image.title}</p>
                      {image.price && (
                        <p className="card-text small fw-bold text-success mb-0">${image.price}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // Default: render text content or user messages
    return message.content;
  };

  return (
    <div className="card shadow-sm h-100" style={{ height: '600px' }}>
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0 d-flex align-items-center">
          <i className="bi bi-chat-dots me-2"></i>
          Chat Assistant
        </h5>
      </div>
      
      <div className="card-body p-0 d-flex flex-column">
        <div className="flex-grow-1 overflow-auto p-3" style={{ maxHeight: 'calc(600px - 120px)' }}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${message.role === 'user' ? 'text-end' : 'text-start'}`}
            >
              <div className="d-flex align-items-start gap-2">
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" 
                         style={{ width: '32px', height: '32px' }}>
                      <i className="bi bi-robot text-white small"></i>
                    </div>
                  </div>
                )}
                
                <div className={`flex-grow-1 ${message.role === 'user' ? 'text-end' : ''}`}>
                  <div
                    className={`d-inline-block p-3 rounded-3 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-white ms-auto'
                        : 'bg-light border'
                    }`}
                    style={{ 
                      maxWidth: '85%',
                      wordWrap: 'break-word'
                    }}
                  >
                    {renderMessageContent(message)}
                  </div>
                  <div className={`small text-muted mt-1 ${message.role === 'user' ? 'text-end' : 'text-start'}`}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center" 
                         style={{ width: '32px', height: '32px' }}>
                      <i className="bi bi-person text-white small"></i>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="mb-4 text-start">
              <div className="d-flex align-items-start gap-2">
                <div className="flex-shrink-0">
                  <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" 
                       style={{ width: '32px', height: '32px' }}>
                    <i className="bi bi-robot text-white small"></i>
                  </div>
                </div>
                <div className="bg-light border rounded-3 p-3 shadow-sm">
                  <div className="d-flex align-items-center gap-2">
                    <div className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></div>
                    <span className="text-muted">AI is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="card-footer bg-light border-top">
          <form onSubmit={handleSubmit} className="d-flex gap-2">
            <div className="flex-grow-1 position-relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about products or how I can help you shop..."
                className="form-control form-control-lg pe-5"
                disabled={isLoading}
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                className="btn btn-link position-absolute top-50 end-0 translate-middle-y me-1 p-1"
                style={{ zIndex: 5 }}
                onClick={() => setInputValue('')}
                disabled={!inputValue || isLoading}
              >
                <i className="bi bi-x-lg text-muted"></i>
              </button>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg px-4"
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? (
                <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
              ) : (
                <i className="bi bi-send"></i>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}