import { useEffect, useState } from 'react';

export default function Home() {
  const [products, setProducts] = useState([]);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>TBS Hardware Ordering</h1>
      <ul>
        <li><a href="/matches">Weekly Order (HH-TB-ST)</a></li>
        <li><a href="/centurion-orders">Centurion Orders</a></li>
        <li><a href="/orders">Orders (WIP)</a></li>
        <li><a href="/compare">Compare (WIP)</a></li>
      </ul>
    </main>
  );
}
