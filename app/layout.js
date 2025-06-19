import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { Inter } from "next/font/google";
import { AuthProvider } from './contexts/AuthContext'; // Import AuthProvider
import { CartProvider } from './contexts/CartContext'; // Import CartProvider
import SiteHeader from '../components/SiteHeader'; // Import SiteHeader

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: 'ShopAI Assistant - Your Smart Shopping Companion',
  description: 'Chat with our AI to browse products, get recommendations, and shop smarter',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link 
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" 
          rel="stylesheet" 
        />
      </head>
      <body className={inter.className}>
        <AuthProvider> {/* Wrap children with AuthProvider */}
          <CartProvider> {/* Wrap with CartProvider */}
            <SiteHeader /> {/* Use the SiteHeader component */}
            <main style={{ paddingTop: '20px', paddingBottom: '20px' }}> {/* Added some padding */}
              {children}
            </main>
            
            {/* Optional Footer
            <footer className="py-4 bg-light mt-auto text-center">
              <div className="container-fluid px-4">
                <div className="d-flex align-items-center justify-content-between small">
                  <div className="text-muted">Copyright &copy; MyStore 2024</div>
                  <div>
                    <a href="#">Privacy Policy</a>
                    &middot;
                    <a href="#">Terms &amp; Conditions</a>
                  </div>
                </div>
              </div>
            </footer> */}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}