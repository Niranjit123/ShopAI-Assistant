// filepath: app/components/SiteHeader.js
'use client';
import Link from 'next/link';
import { useAuth } from '../app/contexts/AuthContext';
import { useCart } from '../app/contexts/CartContext'; // Import useCart

export default function SiteHeader() {
  const { user, signOut } = useAuth();
  const { getCartTotals } = useCart(); // Get cart utility
  const { totalItems } = getCartTotals();

  return (
    <header style={{ 
      padding: '0.75rem 1.5rem', 
      backgroundColor: 'var(--bs-light)',
      borderBottom: '1px solid #dee2e6', 
      // marginBottom: '20px', // Removed margin, handled by main in layout
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)' 
    }}>
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        maxWidth: '1200px', 
        margin: '0 auto' 
      }}>
        <Link href="/" style={{ 
          textDecoration: 'none', 
          color: 'var(--bs-dark)', 
          fontWeight: 'bold', 
          fontSize: '1.8em'
        }}>
          🛍️ MyStore
        </Link>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link 
            href="/cart" 
            className="btn btn-outline-secondary btn-sm" 
            style={{ 
              marginRight: '15px', 
              textDecoration: 'none', 
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              padding: '0.3rem 0.6rem' // Adjusted padding
            }}
          >
            <i className="bi bi-cart3" style={{ fontSize: '1.1rem' }}></i> {/* Cart Icon */}
            <span style={{ marginLeft: '5px', display: totalItems > 0 ? 'inline' : 'none' }}>Cart</span> {/* Hide text if cart empty */}
            {totalItems > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                backgroundColor: 'var(--bs-danger)',
                color: 'white',
                borderRadius: '50%',
                padding: '2px 6px',
                fontSize: '0.70em',
                fontWeight: 'bold',
                lineHeight: '1'
              }}>
                {totalItems}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <Link href="/chat" className="btn btn-outline-primary btn-sm" style={{ marginRight: '15px', textDecoration: 'none' }}>
                Talk with AI
              </Link>
              <span style={{ marginRight: '15px', color: 'var(--bs-secondary)' }}>{user.email}</span>
              <button 
                onClick={async () => {
                  await signOut();
                  // Optionally redirect or show a message
                }} 
                className="btn btn-outline-danger btn-sm"
                style={{ cursor: 'pointer' }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link 
              href="/" // Should link to login/signup page or modal trigger, currently links to home
              className="btn btn-primary btn-sm"
              style={{ textDecoration: 'none' }}
            >
              Login / Sign Up
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}