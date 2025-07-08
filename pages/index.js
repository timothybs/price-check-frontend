import { useEffect, useState } from 'react';

export default function Home() {
  const [products, setProducts] = useState([]);

  const linkStyle = {
    padding: '16px',
    fontSize: '18px',
    backgroundColor: '#f2f2f2',
    border: '1px solid #ccc',
    borderRadius: '6px',
    textDecoration: 'none',
    color: '#333',
    textAlign: 'center'
  };

  return (
    <main style={{ padding: '2rem' }}>
      <h1>TBS Hardware</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
      <a href="/priceandcount" style={linkStyle}>Price and Count</a>
      <a href="/product-editor-competitor" style={linkStyle}>Product Editor</a>
      {/* */}
      </div>
    </main>
  );
}
