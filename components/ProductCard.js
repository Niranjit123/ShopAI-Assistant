export default function ProductCard({ product, onAddToCart }) {
  // This console.log is very helpful for debugging image issues
  console.log('🎴 ProductCard received product:', {
    id: product.id,
    title: product.title,
    // Check if product.image object itself exists and then if .url exists
    hasImageObject: !!product.image,
    imageUrl: product.image?.url, // This is what the <img> tag uses
    price: product.priceRange?.minVariantPrice?.amount || product.price
  });

  const defaultVariantId = product.variants && product.variants.length > 0
    ? product.variants[0].id
    : product.id; // Fallback to product ID if no variants

  const productPrice = product.priceRange?.minVariantPrice?.amount || product.price || '0.00';
  const comparisonPrice = (parseFloat(productPrice) * 1.2).toFixed(2);

  return (
    // The style "marginBottom: '2rem'" here provides the vertical gap between products
    <div className="card h-100 shadow-sm border-0 overflow-hidden" style={{ marginBottom: '2rem' }}>
      <div className="position-relative">
        {/* Image rendering logic - relies on product.image.url being correct */}
        {product.image && product.image.url ? (
          <img
            src={product.image.url}
            alt={product.image.alt || product.title || 'Product Image'} // Use alt from processed product.image
            className="card-img-top"
            style={{
              objectFit: 'cover',
              height: '250px',
              width: '100%',
              transition: 'transform 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            onError={(e) => {
              console.error('❌ Image failed to load in ProductCard:', product.image.url, 'for product:', product.title);
              e.target.style.display = 'none'; // Hide broken image
              // Ensure the next sibling (fallback div) is shown
              if (e.target.nextSibling && e.target.nextSibling.style) {
                 e.target.nextSibling.style.display = 'flex';
              }
            }}
          />
        ) : null} {/* Render nothing if product.image.url is not available, fallback below will show */}

        {/* Fallback placeholder for missing images */}
        {/* This div will display if 'product.image && product.image.url' is falsy */}
        <div
          className="card-img-top bg-light d-flex align-items-center justify-content-center"
          style={{
            height: '250px',
            // Show this fallback if the image condition (product.image && product.image.url) is false
            display: (product.image && product.image.url) ? 'none' : 'flex'
          }}
        >
          <div className="text-center">
            <i className="bi bi-image text-muted mb-2" style={{ fontSize: '3rem' }}></i>
            <p className="text-muted small mb-0">No Image Available</p>
          </div>
        </div>

        {/* Sale Badge */}
        <div className="position-absolute top-0 end-0 m-2">
          <span className="badge bg-danger">
            <i className="bi bi-fire me-1"></i>
            Sale
          </span>
        </div>

        {/* Quick View Button */}
        <div className="position-absolute bottom-0 end-0 m-2">
          <button
            className="btn btn-white btn-sm rounded-circle shadow-sm opacity-75"
            title="Quick View"
          >
            <i className="bi bi-eye"></i>
          </button>
        </div>
      </div>

      <div className="card-body d-flex flex-column p-4">
        <div className="mb-3">
          <h5 className="card-title mb-2 fw-bold" style={{
            fontSize: '1.1rem',
            lineHeight: '1.3',
            height: '2.6rem', // Approx 2 lines
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }} title={product.title}>
            {product.title}
          </h5>

          <p className="card-text text-muted small mb-0" style={{
            height: '4.2rem', // Approx 3 lines (1.4 line height * 3)
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.4'
          }}>
            {product.description || 'High-quality product with excellent features and great value for money.'}
          </p>
        </div>

        <div className="mt-auto">
          {/* Price and Rating Section */}
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <div className="d-flex align-items-baseline gap-2 mb-1">
                <span className="h5 text-success fw-bold mb-0">
                  ${parseFloat(productPrice).toFixed(2)}
                </span>
                <small className="text-muted text-decoration-line-through">
                  ${comparisonPrice}
                </small>
              </div>
              <small className="text-success fw-medium">
                <i className="bi bi-percent me-1"></i>
                Save {Math.round((1 - parseFloat(productPrice) / parseFloat(comparisonPrice)) * 100)}%
              </small>
            </div>

            <div className="text-end">
              <div className="d-flex align-items-center text-warning mb-1">
                {[...Array(5)].map((_, i) => (
                  <i key={i} className={`bi bi-star${i < 4 ? '-fill' : ''} me-1`} style={{ fontSize: '0.8rem' }}></i>
                ))}
                <small className="text-dark ms-1">4.5</small>
              </div>
              <small className="text-muted">(128 reviews)</small>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-grid gap-2">
            <button
              onClick={() => {
                console.log('🛒 Adding to cart:', { productId: product.id, variantId: defaultVariantId });
                if (defaultVariantId) { // Ensure defaultVariantId is valid before calling
                  onAddToCart(defaultVariantId);
                } else {
                  console.warn("Cannot add to cart: No valid variant ID found for product", product.title);
                  // Optionally, notify the user or disable the button more explicitly
                }
              }}
              className="btn btn-primary btn-lg"
              disabled={!defaultVariantId} // Disable if no valid variant ID
            >
              <i className="bi bi-cart-plus me-2"></i>
              Add to Cart
            </button>

            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary flex-fill">
                <i className="bi bi-heart me-1"></i>
                Wishlist
              </button>
              <button className="btn btn-outline-info flex-fill">
                <i className="bi bi-share me-1"></i>
                Share
              </button>
            </div>
          </div>

          {/* Product Features */}
          <div className="mt-3 pt-3 border-top">
            <div className="row g-0 text-center">
              <div className="col-4">
                <i className="bi bi-truck text-success d-block mb-1"></i>
                <small className="text-muted">Free Ship</small>
              </div>
              <div className="col-4">
                <i className="bi bi-arrow-clockwise text-info d-block mb-1"></i>
                <small className="text-muted">Easy Return</small>
              </div>
              <div className="col-4">
                <i className="bi bi-shield-check text-warning d-block mb-1"></i>
                <small className="text-muted">Warranty</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}