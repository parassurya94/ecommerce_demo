import React from 'react';
import Header from './Header';
import Footer from './Footer';

export default function DefaultLayout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ padding: '2rem 20px', maxWidth: '1280px', margin: '0 auto', flexGrow: 1, width: '100%', boxSizing: 'border-box' }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}