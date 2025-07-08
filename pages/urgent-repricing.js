import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const UrgentRepricing = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchUrgentProducts = async () => {
      const fromDate = '2024-03-07';

      const { data, error } = await supabase
        .from('urgent_margin_mv')
        .select('*')
        .gte('last_ordered_at', fromDate)
        .lt('margin', 0.4)
        .order('last_ordered_at', { ascending: false });

      if (error) {
        console.error('Error fetching urgent products:', error.message);
      } else {
        setProducts(data);
      }
    };

    fetchUrgentProducts();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Urgent Repricing List</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr>
            <th>Title</th>
            <th style={{ textAlign: 'center' }}>Variant Price</th>
            <th style={{ textAlign: 'center' }}>Best Cost</th>
            <th style={{ textAlign: 'center' }}>Margin</th>
            <th style={{ textAlign: 'center' }}>Barcode</th>
            <th style={{ textAlign: 'center' }}>Supplier</th>
            <th style={{ textAlign: 'center' }}>Last Ordered At</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f9f9f9' : '#ffffff' }}>
              <td>{p.title}</td>
              <td style={{ textAlign: 'center' }}>{parseFloat(p.variant_price).toFixed(2)}</td>
              <td style={{ textAlign: 'center' }}>{parseFloat(p.best_cost).toFixed(2)}</td>
              <td style={{ textAlign: 'center' }}>{(parseFloat(p.margin) * 100).toFixed(2)}%</td>
              <td style={{ textAlign: 'center' }}>{p.variant_barcode}</td>
              <td style={{ textAlign: 'center' }}>{p.best_supplier}</td>
              <td style={{ textAlign: 'center' }}>{p.last_ordered_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UrgentRepricing;