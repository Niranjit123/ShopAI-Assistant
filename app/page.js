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
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, messageHistory: messages })
      });
      
      const data = await response.json();
      
      // Add AI response to chat
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      
      // Handle any products returned from search
      if (data.products && data.products.length > 0) {
        setProducts(data.products);
      }
      
      // Handle cart updates
      if (data.cartUpdate) {
        setCart(data.cartUpdate.cart);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (productId, variantId) => {
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
        content: `Added ${data.product.title} to your cart!` 
      }]);
      
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <ChatInterface 
          messages={messages} 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
        />
        
        {products.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">Product Results</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={(variantId) => addToCart(product.id, variantId)} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      <CartSidebar cart={cart} />
    </div>
  );
}