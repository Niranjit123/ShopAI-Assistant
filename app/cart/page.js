'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '../contexts/CartContext';
import Image from 'next/image'; // For optimized images

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, clearCart, getCartTotals } = useCart();
  const { totalItems, totalAmount, currencyCode } = getCartTotals();

  if (cartItems.length === 0) {
    return (
      <div className="container text-center py-5">
        <i className="bi bi-cart-x" style={{ fontSize: '4rem', color: 'var(--bs-secondary)' }}></i>
        <h2 className="mt-3">Your Cart is Empty</h2>
        <p className="text-muted">Looks like you haven't added anything to your cart yet.</p>
        <Link href="/" className="btn btn-primary mt-3">
          <i className="bi bi-arrow-left me-2"></i>Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <h1>Your Shopping Cart</h1>
        {cartItems.length > 0 && (
          <button onClick={clearCart} className="btn btn-outline-danger">
            <i className="bi bi-trash me-2"></i>Clear Cart
          </button>
        )}
      </div>

      <div className="row">
        <div className="col-lg-8 mb-4 mb-lg-0">
          {cartItems.map(item => (
            <div key={item.variantId} className="card mb-3 shadow-sm">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-2 col-3 text-center">
                    <Image
                      src={item.image || '/placeholder-image.png'}
                      alt={item.name}
                      width={80}
                      height={80}
                      style={{ objectFit: 'contain', borderRadius: '0.25rem' }}
                      className="img-fluid"
                    />
                  </div>
                  <div className="col-md-4 col-9">
                    <h5 className="mb-1 h6">{item.name}</h5>
                    <p className="text-muted small mb-1">{item.variantTitle}</p>
                    <p className="fw-bold mb-0 small">{parseFloat(item.price).toFixed(2)} {item.currencyCode}</p>
                  </div>
                  <div className="col-md-3 col-7 mt-2 mt-md-0">
                    <div className="input-group input-group-sm" style={{ maxWidth: '120px' }}>
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      >
                        -
                      </button>
                      <input
                        type="number" // Changed to text to better control value, parsing done in handler
                        className="form-control text-center px-1" // Reduced padding
                        value={item.quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow empty input for user to type, but update only if valid number
                          if (val === "") {
                             updateQuantity(item.variantId, 0); // Or handle as "to be typed"
                          } else {
                            const newQuantity = parseInt(val, 10);
                            if (!isNaN(newQuantity)) { // Allow 0 to remove via updateQuantity logic
                              updateQuantity(item.variantId, newQuantity);
                            }
                          }
                        }}
                        min="0" // HTML5 validation, but JS handles logic
                      />
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="col-md-2 col-3 mt-2 mt-md-0 text-md-end">
                    <p className="fw-bold mb-0 small">
                      {(parseFloat(item.price) * item.quantity).toFixed(2)} {item.currencyCode}
                    </p>
                  </div>
                  <div className="col-md-1 col-2 mt-2 mt-md-0 text-end">
                    <button
                      onClick={() => removeFromCart(item.variantId)}
                      className="btn btn-sm btn-link text-danger" // Changed to link style
                      title="Remove item"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm sticky-top" style={{top: '20px'}}>
            <div className="card-body">
              <h4 className="card-title mb-3">Order Summary</h4>
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                  Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})
                  <span>{totalAmount.toFixed(2)} {currencyCode}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                  Shipping
                  <span className="text-success">FREE</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-0 fw-bold h5 mt-2">
                  Total
                  <span>{totalAmount.toFixed(2)} {currencyCode}</span>
                </li>
              </ul>
              <button 
                className="btn btn-primary w-100 mt-3 btn-lg" 
                onClick={() => alert('Proceed to Checkout (Not Implemented Yet)')}
              >
                Proceed to Checkout
              </button>
              <Link href="/" className="btn btn-outline-secondary w-100 mt-2">
                <i className="bi bi-arrow-left me-2"></i>Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}