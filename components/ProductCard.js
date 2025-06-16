'use client';

import { useState } from 'react';
import ProductDetailsModal from './ProductDetailsModal';

export default function ProductCard({ product, onAddToCart, selectedProduct, setSelectedProduct }) {
  const showModal = selectedProduct?.id === product.id;
  
  const productPrice = product.priceRange?.minVariantPrice?.amount || product.price || '0.00';
  // Get currency code, default to INR if not available
  const currencyCode = product.priceRange?.minVariantPrice?.currencyCode || 'INR'; 

  // Define firstVariant here so it's available for the button's disabled state and handleAddToCart
  let firstVariant = null;
  if (product.variants && product.variants.length > 0) {
    // Ensure the variant ID is a valid Shopify ProductVariant GID
    const validVariant = product.variants.find(v => v.id && typeof v.id === 'string' && v.id.includes('ProductVariant'));
    if (validVariant) {
      firstVariant = validVariant;
    }
  }

  const handleOpenModal = () => {
    setSelectedProduct(product);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const handleAddToCart = () => {
    if (firstVariant && firstVariant.availableForSale) {
      onAddToCart(firstVariant.id); // Pass the variant GID
    } else {
      console.warn('Add to cart clicked, but no valid/available variant found for:', product.title);
      // Optionally, you can trigger a user-facing message here
      // e.g., by calling a function passed via props or setting a local state
    }
  };

  return (
    <div className="col">
      <div className="card h-100 product-card shadow-sm">
        {product.image && (
          <img 
            src={product.image.url} 
            className="card-img-top" 
            alt={product.image.altText || product.title} 
            onClick={handleOpenModal}
            style={{ cursor: 'pointer', height: '200px', objectFit: 'cover' }}
          />
        )}
        <div className="card-body d-flex flex-column">
          <h5 
            className="card-title" 
            onClick={handleOpenModal}
            style={{ cursor: 'pointer' }}
          >
            {product.title}
          </h5>
          {/* Display price with currency code */}
          <p className="card-text fw-bold">{productPrice} {currencyCode}</p> 
          <div className="mt-auto">
            <button 
              onClick={handleAddToCart} 
              className="btn btn-sm btn-outline-primary w-100 mb-2"
              // Use the firstVariant defined above for the disabled state
              disabled={!firstVariant || !firstVariant.availableForSale} 
            >
              <i className="bi bi-cart-plus me-1"></i> Add to Cart
            </button>
            <button onClick={handleOpenModal} className="btn btn-sm btn-outline-secondary w-100">
              View Details
            </button>
          </div>
        </div>
      </div>
      {/* Modal is now handled in page.js to avoid nesting issues */}
    </div>
  );
}