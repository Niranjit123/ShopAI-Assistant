export default function ProductCard({ product, onAddToCart }) {
    const defaultVariantId = product.variants && product.variants.length > 0 
      ? product.variants[0].id 
      : null;
    
    return (
      <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
        {product.image && (
          <img 
            src={product.image.url} 
            alt={product.title} 
            className="w-full h-48 object-cover"
          />
        )}
        <div className="p-4">
          <h3 className="font-semibold text-lg">{product.title}</h3>
          <p className="text-gray-600 text-sm mt-1">{product.description}</p>
          <div className="mt-2 font-medium">
            ${product.priceRange.minVariantPrice.amount}
          </div>
          
          <button
            onClick={() => onAddToCart(defaultVariantId)}
            className="mt-3 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition"
            disabled={!defaultVariantId}
          >
            Add to Cart
          </button>
        </div>
      </div>
    );
  }