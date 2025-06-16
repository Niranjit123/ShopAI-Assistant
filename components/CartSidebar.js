import React from 'react';

export default function CartSidebar({ cart = [], total = 0, currencyCode = 'INR', onCheckout, onViewCart }) {
  // Force INR for display purposes within this component
  const displayCurrency = 'INR'; 

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
        <h6 className="mb-0 d-flex align-items-center">
          <i className="bi bi-cart3 me-2"></i> Your Cart
        </h6>
        {cart.length > 0 && (
          <span className="badge bg-primary rounded-pill">{cart.length}</span>
        )}
      </div>
      <div className="card-body p-3" style={{ maxHeight: '350px', overflowY: 'auto' }}>
        {cart.length === 0 ? (
          <div className="text-center text-muted py-4">
            <i className="bi bi-cart-x" style={{ fontSize: '3rem' }}></i>
            <p className="mt-2 mb-1">Your cart is empty</p>
            <small>Start shopping to add items.</small>
          </div>
        ) : (
          <ul className="list-group list-group-flush">
            {cart.map((item, index) => (
              <li key={item.id || index} className="list-group-item px-0 py-3">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="mb-1 small text-truncate" style={{maxWidth: '180px'}}>{item.title}</h6>
                    {item.variantTitle && item.variantTitle !== "Default Title" && (
                      <small className="text-muted d-block">Variant: {item.variantTitle}</small>
                    )}
                    <small className="text-muted">Qty: {item.quantity}</small>
                  </div>
                  <div className="text-end ps-2">
                    <span className="fw-bold small">
                      {/* Use forced displayCurrency here */}
                      {parseFloat(item.price * item.quantity).toFixed(2)} {displayCurrency}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {cart.length > 0 && (
        <div className="card-footer bg-white border-top p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">Total:</h6>
            <h6 className="mb-0 fw-bold">
              {/* Use forced displayCurrency here */}
              {parseFloat(total).toFixed(2)} {displayCurrency}
            </h6>
          </div>
          <div className="d-grid gap-2">
            <button 
              className="btn btn-success btn-lg" 
              onClick={onCheckout || (() => alert('Checkout process not implemented yet.'))}
            >
              <i className="bi bi-credit-card me-2"></i>Checkout
            </button>
            {onViewCart && (
              <button className="btn btn-outline-secondary" onClick={onViewCart}>
                <i className="bi bi-eye me-2"></i>View Cart Details
              </button>
            )}
          </div>
          <div className="text-center mt-3">
            <small className="text-muted">
              <i className="bi bi-shield-check me-1"></i>Secure checkout guaranteed
            </small>
          </div>
        </div>
      )}
    </div>
  );
}