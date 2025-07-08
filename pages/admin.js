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
      <a href="/product-editor" style={linkStyle}>Product Editor</a>
      {/* */}
      <a href="/matches" style={linkStyle}>Weekly Order (HH-TB-ST)</a>
      <a href="/centurion-orders" style={linkStyle}>Centurion Orders</a>
      <a href="/wilsons-orders" style={linkStyle}>Wilsons Orders</a>
      <a href="/toolstream-orders" style={linkStyle}>Toolstream Orders</a>
      <a href="/orders" style={linkStyle}>Orders (WIP)</a>
      <a href="/compare" style={linkStyle}>Compare (WIP)</a>
      <a href="/duplicate-reviewer" style={linkStyle}>Duplicate Reviewer</a>
      <a href="/editor-log" style={linkStyle}>Editor Log</a>
      <a href="/create-log" style={linkStyle}>Create Log</a>
      </div>
    </main>
  );
}
