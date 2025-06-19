'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'; // Added useCallback

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const instanceId = Math.random().toString(36).substring(2, 9);
    console.log(`[CartProvider] Mounted. Instance ID: ${instanceId}. Initial cartItems:`, JSON.stringify(cartItems));
    return () => {
      console.log(`[CartProvider] Unmounted. Instance ID: ${instanceId}`);
    };
  }, []); // Empty dependency array, runs only on mount and unmount

  useEffect(() => {
    console.log('[CartProvider] cartItems state changed:', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback((product, variant, quantity = 1) => {
    console.log('[CartContext] addToCart called for product:', product?.name, 'variant:', variant?.title);
    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        item => item.variantId === variant.id
      );
      let newItems;
      if (existingItemIndex > -1) {
        newItems = prevItems.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        newItems = [
          ...prevItems,
          {
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            title: product.name, // Ensure this uses product.name
            variantTitle: variant.title,
            price: variant.price.amount,
            currencyCode: variant.price.currencyCode,
            image: product.image?.url || (product.images && product.images.length > 0 && product.images[0]?.url ? product.images[0].url : '/placeholder-image.png'),
            quantity,
          },
        ];
      }
      return newItems;
    });
  }, []); // Added useCallback for stable function reference

  const removeFromCart = useCallback((variantId) => {
    console.log('[CartContext] removeFromCart called for variantId:', variantId);
    setCartItems(prevItems => prevItems.filter(item => item.variantId !== variantId));
  }, []);

  const updateQuantity = useCallback((variantId, newQuantity) => {
    console.log('[CartContext] updateQuantity called for variantId:', variantId, 'newQuantity:', newQuantity);
    if (newQuantity <= 0) {
      removeFromCart(variantId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.variantId === variantId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  }, [removeFromCart]); // removeFromCart is a dependency

  const clearCart = useCallback(() => {
    console.error('[CartContext] clearCart called! Cart is being emptied.');
    console.trace('[CartContext] clearCart stack trace:'); // Provides a stack trace
    setCartItems([]);
  }, []);

  const getCartTotals = useCallback(() => {
    // console.log('[CartContext] getCartTotals called. Current cartItems:', JSON.stringify(cartItems)); // Can be noisy
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const currencyCode = cartItems.length > 0 ? cartItems[0].currencyCode : 'INR';
    return { totalItems, totalAmount, currencyCode };
  }, [cartItems]); // cartItems is a dependency

  const contextValue = React.useMemo(() => ({
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotals,
  }), [cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotals]);


  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};