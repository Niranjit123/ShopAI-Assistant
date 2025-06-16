import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';

export const metadata = {
  title: 'ShopAI Assistant - Your Smart Shopping Companion',
  description: 'Chat with our AI to browse products, get recommendations, and shop smarter',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link 
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" 
          rel="stylesheet" 
        />
      </head>
      <body>
        <header className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
          <div className="container">
            <a className="navbar-brand d-flex align-items-center" href="#">
              <i className="bi bi-shop me-2 fs-4"></i>
              <span className="fw-bold">ShopAI Assistant</span>
            </a>
            <div className="navbar-nav ms-auto">
              <span className="nav-item">
                <span className="nav-link d-flex align-items-center">
                  <i className="bi bi-person-circle me-1"></i>
                  Welcome back!
                </span>
              </span>
            </div>
          </div>
        </header>
        
        <main style={{ minHeight: 'calc(100vh - 140px)' }}>
          {children}
        </main>
        
        {/* <footer className="bg-light border-top py-4 mt-5">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-md-6">
                <p className="text-muted mb-0">
                  <i className="bi bi-c-circle me-1"></i>
                  2025 ShopAI Assistant - Powered by AI
                </p>
              </div>
              <div className="col-md-6 text-md-end">
                <small className="text-muted d-flex align-items-center justify-content-md-end">
                  <i className="bi bi-shield-check me-1 text-success"></i>
                  Secure Shopping Experience
                </small>
              </div>
            </div>
          </div>
        </footer> */}
      </body>
    </html>
  );
}