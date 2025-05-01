export default function CartSidebar({ cart }) {
    const cartItems = cart || [];
    
    const calculateTotal = () => {
      return cartItems.reduce((total, item) => {
        return total + (parseFloat(item.price) * item.quantity);
      }, 0).toFixed(2);
    };
    
    return (
      <div className="w-full md:w-80 border rounded-lg p-4">
        <h2 className="font-semibold text-lg mb-4">Your Cart</h2>
        
        {cartItems.length === 0 ? (
          <p className="text-gray-500">Your cart is empty</p>
        ) : (
          <>
            <ul className="space-y-3">
              {cartItems.map((item) => (
                <li key={item.id} className="border-b pb-2">
                  <div className="flex justify-between">
                    <span>{item.title}</span>
                    <span className="font-medium">${parseFloat(item.price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Qty: {item.quantity}</span>
                  </div>
                </li>
              ))}
            </ul>
            
            <div className="mt-4 pt-3 border-t">
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>${calculateTotal()}</span>
              </div>
              
              <button className="w-full mt-4 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition">
                Checkout
              </button>
            </div>
          </>
        )}
      </div>
    );
  }