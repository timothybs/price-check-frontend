import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export default function PriceCompare() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('competitor_price_comparison')
        .select('*')
        .order('fetched_at', { ascending: false });

      if (error) console.error('❌ Supabase fetch error:', error.message);
      else setProducts(data);
    }

    fetchData();
  }, []);

  function getDiffStyle(shopify, competitor) {
    if (shopify < competitor) return { backgroundColor: '#f8d7da' }; // red
    if (shopify <= competitor * 1.1) return { backgroundColor: '#d4edda' }; // green
    return { backgroundColor: '#fff3cd' }; // yellow
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '2rem' }}>🧾 Price Comparison</h1>
      <table border="1" cellPadding="8" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>🖼 Image</th>
            <th>📦 Product</th>
            <th>🏷 Barcode</th>
            <th>💰 Shopify Price</th>
            <th>💸 Competitor Price</th>
            <th>💹 Diff</th>
            <th>% Diff</th>
            <th>🌍 Source</th>
            <th>⏰ Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {products.map((row) => {
            const shopifyPrice = row.shopify_price || 0;
            const competitorPrice = row.competitor_price || 0;
            const priceDiff = (shopifyPrice - competitorPrice).toFixed(2);
            const percentDiff = competitorPrice
              ? (((shopifyPrice - competitorPrice) / competitorPrice) * 100).toFixed(2)
              : null;

            return (
              <tr key={row.competitor_price_id}>
                <td>
                  {row.image_url ? (
                    <img src={row.image_url} alt="product" style={{ width: '50px', height: 'auto' }} />
                  ) : (
                    '❌'
                  )}
                </td>
                <td>{row.title || '—'}</td>
                <td>{row.barcode || '—'}</td>
                <td>£{shopifyPrice.toFixed(2)}</td>
                <td>{competitorPrice ? `£${competitorPrice.toFixed(2)}` : '—'}</td>
                <td style={getDiffStyle(shopifyPrice, competitorPrice)}>£{priceDiff}</td>
                <td style={getDiffStyle(shopifyPrice, competitorPrice)}>{percentDiff ? `${percentDiff}%` : '—'}</td>
                <td>
                  {row.competitor_url ? (
                    <a href={row.competitor_url} target="_blank" rel="noopener noreferrer">
                      {row.source}
                    </a>
                  ) : (
                    row.source
                  )}
                </td>
                <td>{new Date(row.fetched_at).toLocaleString('en-GB')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
