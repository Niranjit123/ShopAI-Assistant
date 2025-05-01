import './globals.css';

export const metadata = {
  title: 'E-commerce Chat Assistant',
  description: 'Chat with our AI to browse products and shop',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="bg-blue-600 text-white p-4">
          <h1 className="text-xl font-bold">ShopAI Assistant</h1>
        </header>
        <main className="container mx-auto p-4">
          {children}
        </main>
        <footer className="bg-gray-100 p-4 text-center text-sm text-gray-600">
          © 2025 ShopAI Assistant
        </footer>
      </body>
    </html>
  );
}