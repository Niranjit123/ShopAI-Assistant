'use client';

import { useState } from 'react';
import ProductDetailsModal from './ProductDetailsModal';

export default function ProductCard({ product, onAddToCart }) {
  const [showModal, setShowModal] = useState(false);
  
  const defaultVariantId = product.variants && product.variants.length > 0 
    ? product.variants[0].id 
    : product.id;
  const productPrice = product.priceRange?.minVariantPrice?.amount || product.price || '0.00';
  
  const handleCardClick = () => {
    console.log('Card clicked, showing modal for:', product.title);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    console.log('Closing modal for:', product.title);
    setShowModal(false);
  };

  return (
    <>
      <div 
        className="card shadow h-100 border-0 transition-hover" 
        style={{ 
          maxWidth: '100%', 
          borderRadius: '12px',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer'
        }}
        onClick={handleCardClick}
      >
        <div className="position-relative">
          {product.image && product.image.url ? (
            <img
              src={product.image.url}
              alt={product.image.alt || product.title}
              className="card-img-top"
              style={{ 
                objectFit: 'cover', 
                height: '220px', 
                width: '100%',
              }}
            />
          ) : (
            <div className="d-flex align-items-center justify-content-center bg-light" style={{ height: '220px', width: '100%' }}>
              <i className="bi bi-image text-muted" style={{ fontSize: '3rem' }}></i>
            </div>
          )}
        </div>
        <div className="card-body d-flex flex-column p-4">
          <h5 className="fw-bold mb-2" style={{ fontSize: '1.15rem', minHeight: '2.5rem', lineHeight: '1.3' }}>{product.title}</h5>
          <div className="mb-3">
            <span className="text-success fw-bold" style={{ fontSize: '1.2rem' }}>
              {productPrice} {product.priceRange?.minVariantPrice?.currencyCode || ''}
            </span>
          </div>
          <p className="text-muted small mb-3" style={{ minHeight: '3.5rem', lineHeight: '1.5' }}>
            {product.description || 'No description available.'}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent the card click event
              onAddToCart(defaultVariantId);
            }}
            className="btn btn-primary mt-auto w-100"
            disabled={!defaultVariantId}
            style={{ borderRadius: '8px' }}
          >
            <i className="bi bi-cart-plus me-2"></i>
            Add to Cart
          </button>
        </div>
      </div>
      
      {showModal && (
        <div id="product-modal-container" style={{ position: 'relative', zIndex: 1100 }}>
          <ProductDetailsModal 
            product={product} 
            onClose={handleCloseModal}
            onAddToCart={(variantId) => {
              onAddToCart(variantId);
              handleCloseModal();
            }}
          />
        </div>
      )}
    </>
  );
}