'use client';

import { useEffect } from 'react';

export default function ProductDetailsModal({ product, onClose, onAddToCart }) {
  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  // Prevent scrolling of the background when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Log when modal is opened
  useEffect(() => {
    console.log('Modal opened for product:', product.title);
  }, [product.title]);

  if (!product) return null;

  const defaultVariantId = product.variants && product.variants.length > 0 
    ? product.variants[0].id 
    : product.id;
  
  const productPrice = product.priceRange?.minVariantPrice?.amount || product.price || '0.00';
  const currencyCode = product.priceRange?.minVariantPrice?.currencyCode || '';

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1050,
        padding: '1rem'
      }}
    >
      <div 
        className="modal-content bg-white" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '800px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div 
          className="modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #dee2e6'
          }}
        >
          <h5 className="modal-title">{product.title}</h5>
          <button 
            type="button" 
            className="btn-close" 
            onClick={onClose}
            aria-label="Close"
          ></button>
        </div>
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          <div className="row">
            <div className="col-md-6">
              {product.image && product.image.url ? (
                <img
                  src={product.image.url}
                  alt={product.image.alt || product.title}
                  className="img-fluid rounded"
                  style={{ 
                    width: '100%', 
                    height: 'auto', 
                    maxHeight: '400px', 
                    objectFit: 'contain' 
                  }}
                />
              ) : (
                <div className="d-flex align-items-center justify-content-center bg-light rounded" style={{ height: '300px', width: '100%' }}>
                  <i className="bi bi-image text-muted" style={{ fontSize: '3rem' }}></i>
                </div>
              )}
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <span className="text-success fw-bold fs-4">
                  {productPrice} {currencyCode}
                </span>
              </div>
              
              <div className="mb-4">
                <h6 className="fw-bold mb-2">Description</h6>
                <p>{product.description || 'No description available.'}</p>
              </div>
              
              {product.variants && product.variants.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-bold mb-2">Variants</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {product.variants.map((variant) => (
                      <div key={variant.id} className="badge bg-light text-dark p-2">
                        {variant.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {product.tags && product.tags.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-bold mb-2">Tags</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <span key={index} className="badge bg-secondary p-2">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => onAddToCart(defaultVariantId)}
                className="btn btn-primary w-100"
                disabled={!defaultVariantId}
              >
                <i className="bi bi-cart-plus me-2"></i>
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
