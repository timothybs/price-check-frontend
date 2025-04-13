// pages/duplicate-editor.js
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;   
const supabase = createClient(supabaseUrl, supabaseKey);

const DuplicateEditor = () => {
  const router = useRouter();
  const [barcode, setBarcode] = useState('');
  const [duplicates, setDuplicates] = useState([]);

  useEffect(() => {
    if (router.query.barcode) {
      setBarcode(router.query.barcode);
    }
  }, [router.query.barcode]);

  useEffect(() => {
    if (!barcode) return;

    const fetchDuplicates = async () => {
      const { data, error } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('variant_barcode', barcode);

      if (error) {
        console.error('Error fetching duplicates:', error.message);
      } else {
        setDuplicates(data);
      }
    };

    fetchDuplicates();
  }, [barcode]);

  const handleMarkAsMaster = (variantId) => {
    console.log(`Marking variant ${variantId} as master`);
    // TODO: implement real mutation
  };

  const handleDelete = async (productId) => {
    try {
      const response = await fetch('/api/delete-shopify-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_id: productId }),
      });

      const result = await response.json();
      console.log('Deleted product:', result);
      if (response.ok) {
        setDuplicates(prev => prev.filter(item => item.product_id !== productId));
        router.push(`/product-editor?barcode=${barcode}`);
      }
    } catch (err) {
      console.error('Error deleting Shopify product:', err);
    }
  };

  const handleSelect = (variantId) => {
    console.log(`Selected variant ${variantId} for editing`);
    // TODO: navigate back to product-editor or apply variant selection
  };

  return (
    <div style={{ padding: '20px', fontSize: '18px' }}>
      <h1>Duplicate Editor</h1>
      {barcode && <p>Showing results for barcode: <strong>{barcode}</strong></p>}

      {duplicates.length === 0 ? (
        <p>No duplicates found for this barcode.</p>
      ) : (
        <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Variant ID</th>
              <th>Product ID</th>
              <th>Price</th>
              <th>Cost</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {duplicates.map((item, index) => (
              <tr key={index}>
                <td>{item.title}</td>
                <td>{item.variant_id}</td>
                <td>{item.product_id}</td>
                <td>{item.variant_price}</td>
                <td>{item.cost_per_item}</td>
                <td>
                  <button onClick={() => handleSelect(item.variant_id)} style={{ padding: '10px', marginRight: '5px' }}>Select</button>
                  <button onClick={() => handleMarkAsMaster(item.variant_id)} style={{ padding: '10px', marginRight: '5px' }}>Mark as Master</button>
                  <button onClick={() => handleDelete(item.product_id)} style={{ padding: '10px' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DuplicateEditor;
