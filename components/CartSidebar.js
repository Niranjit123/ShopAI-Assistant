export default function CartSidebar({ cart }) {
  const cartItems = cart || [];
  
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0).toFixed(2);
  };
  
  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white border-bottom">
        <h5 className="mb-0 d-flex align-items-center justify-content-between">
          <span className="d-flex align-items-center">
            <i className="bi bi-cart3 me-2 text-primary"></i>
            Your Cart
          </span>
          {cartItems.length > 0 && (
            <span className="badge bg-primary rounded-pill">{cartItems.length}</span>
          )}
        </h5>
      </div>
      
      <div className="card-body p-3">
        {cartItems.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-cart-x fs-1 text-muted mb-3 d-block"></i>
            <p className="text-muted mb-0">Your cart is empty</p>
            <small className="text-muted">Start shopping to add items</small>
          </div>
        ) : (
          <>
            <div className="cart-items mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {cartItems.map((item, index) => (
                <div key={item.id} className={`d-flex align-items-center p-2 rounded ${index > 0 ? 'border-top' : ''}`}>
                  <div className="flex-grow-1">
                    <h6 className="mb-1 text-truncate" style={{ maxWidth: '180px' }}>
                      {item.title}
                    </h6>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        <i className="bi bi-hash me-1"></i>
                        Qty: {item.quantity}
                      </small>
                      <span className="fw-semibold text-success">
                        ${parseFloat(item.price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-top pt-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-semibold">Total:</span>
                <span className="fw-bold text-primary fs-5">${calculateTotal()}</span>
              </div>
              
              <div className="d-grid gap-2">
                <button className="btn btn-success btn-lg">
                  <i className="bi bi-credit-card me-2"></i>
                  Checkout
                </button>
                <button className="btn btn-outline-secondary btn-sm">
                  <i className="bi bi-eye me-1"></i>
                  View Cart Details
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      
      {cartItems.length > 0 && (
        <div className="card-footer bg-light border-top py-2">
          <div className="d-flex align-items-center justify-content-center">
            <i className="bi bi-shield-check text-success me-1"></i>
            <small className="text-muted">Secure checkout guaranteed</small>
          </div>
        </div>
      )}
    </div>
  );
}