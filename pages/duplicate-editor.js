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

  const getCheapestProductId = () => {
    if (duplicates.length < 2) return null;
    const sorted = [...duplicates].sort((a, b) => (a.variant_price || 0) - (b.variant_price || 0));
    return sorted[0]?.product_id;
  };

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
        router.push(`/product-editor-competitor?barcode=${barcode}`);
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
    <div className="editor-container">
      <h1>Duplicate Editor</h1>
      {barcode && <p>Showing results for barcode: <strong>{barcode}</strong></p>}

      {duplicates.length === 0 ? (
        <p>No duplicates found for this barcode.</p>
      ) : (
        <div className="duplicate-list">
          {duplicates.map((item, index) => {
            const cheapestId = getCheapestProductId();
            return (
              <div key={index} className="duplicate-card">
                <p><strong>Title:</strong> {item.title}</p>
                <p><strong>Variant ID:</strong> {item.variant_id}</p>
                <p><strong>Product ID:</strong> {item.product_id}</p>
                <p><strong>Price:</strong> {item.variant_price}</p>
                <p><strong>Cost:</strong> {item.cost_per_item}</p>
                {item.product_id === cheapestId && (
                  <p style={{ color: '#e63946', fontWeight: 'bold' }}>Suggested for deletion</p>
                )}
                <div style={{ marginTop: '10px' }}>
                  <button onClick={() => handleDelete(item.product_id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style jsx>{`
        .editor-container {
          max-width: 960px;
          margin: 0 auto;
          padding: 24px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          color: #222;
        }

        h1 {
          font-size: 28px;
          margin-bottom: 20px;
        }

        .duplicate-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 20px;
        }

        .duplicate-card {
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 16px;
          background-color: #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }

        button {
          padding: 10px 15px;
          background-color: #e63946;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        p {
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
};

export default DuplicateEditor;
