'use client';

import { useState, useEffect } from 'react';

export default function ChatInterface({ messages, onSendMessage, isLoading, messagesEndRef }) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    onSendMessage(inputValue);
    setInputValue('');
  };

  const renderMessageContent = (message) => {
    // Check if message contains images
    if (message.images && message.images.length > 0) {
      return (
        <div>
          <div className="mb-3">{message.content}</div>
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
                      // Open image in modal or new tab
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