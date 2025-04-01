import { useEffect, useState } from 'react';

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3001/products?page=1&limit=10')
      .then(res => res.json())
      .then(data => setProducts(data.data || []));
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>🛒 Shopify Products</h1>
      <ul>
        {products.map(p => (
          <li key={p.id}>
            {p.title} - £{p.price} - {p.barcode}
          </li>
        ))}
      </ul>
    </main>
  );
}
