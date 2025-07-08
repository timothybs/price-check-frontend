import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

const DuplicateReviewer = () => {
  const [products, setProducts] = useState([]);
  const [currentBarcodeIndex, setCurrentBarcodeIndex] = useState(0);
  const [barcodes, setBarcodes] = useState([]);
  const [groupCount, setGroupCount] = useState(0);
  const [deleteAllInProgress, setDeleteAllInProgress] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

  const fetchDuplicateGroupCount = async () => {
    const { data, error } = await supabase.rpc('count_duplicate_barcode_groups');
    if (error) {
      console.error('Failed to fetch duplicate group count:', error.message);
      return;
    }
    if (data && typeof data === 'number') {
      setGroupCount(data);
    } else if (data?.count) {
      setGroupCount(data.count);
    }
  };

  const refreshData = async () => {
    const { data, error } = await supabase.rpc('get_duplicate_shopify_products');
    if (error) {
      console.error('Error refreshing duplicates:', error.message);
      return;
    }

    const barcodeGroups = [...new Set(data.map(p => p.variant_barcode))];

    setBarcodes(barcodeGroups);
    setProducts(data);
  };

  useEffect(() => {
    refreshData();
    fetchDuplicateGroupCount();
  }, []);

  useEffect(() => {
    refreshData();
    fetchDuplicateGroupCount();
  }, [currentBarcodeIndex]);

  const currentBarcode = barcodes[currentBarcodeIndex];
  const currentGroup = products.filter(p => p.variant_barcode === currentBarcode);

  const lowestPriceId = currentGroup.reduce((minId, product) => {
    return product.variant_price < currentGroup.find(p => p.id === minId)?.variant_price ? product.id : minId;
  }, currentGroup[0]?.id);

  const handleDelete = async (shopifyId, supabaseId, title) => {
    console.log("Deleting from UI:", { shopifyId, supabaseId, title });
    try {
      const response = await fetch('/api/delete-shopify-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: shopifyId }),
      });

      if (!response.ok) throw new Error('Failed to delete from Shopify');

      const supaDelete = await supabase
        .from('shopify_products')
        .delete()
        .eq('id', supabaseId);

      if (supaDelete.error) throw supaDelete.error;

      const { error: logError } = await supabase
        .from('product_editor_deletes')
        .insert([{
          product_id: shopifyId,
          variant_id: supabaseId,
          title: title,
          deleted_at: new Date().toISOString()
        }]);

      if (logError) {
        console.error('Failed to log deletion:', logError.message);
      } else {
        console.log('Logged deleted product:', title);
      }

      setProducts(prev => prev.filter(p => p.id !== supabaseId));
      setTimeout(async () => {
        const remaining = products.filter(p => p.variant_barcode === currentBarcode && p.id !== supabaseId);
        if (remaining.length <= 1) {
          setCurrentBarcodeIndex(i => Math.min(i + 1, barcodes.length - 1));
        }
        await refreshData();
      }, 250);
    } catch (err) {
      console.error('Failed to delete product:', err.message);
    }
  };

  const handleDeleteAll = async () => {
    setDeleteAllInProgress(true);
    setDeleteProgress(0);
    for (let i = 0; i < currentGroup.length; i++) {
      const p = currentGroup[i];
      await handleDelete(p.product_id, p.id, p.title);
      setDeleteProgress(i + 1);
    }
    await refreshData();
    setDeleteAllInProgress(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setCurrentBarcodeIndex(i => Math.min(i + 1, barcodes.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentBarcodeIndex(i => Math.max(i - 1, 0));
      } else if (e.shiftKey && e.key.toLowerCase() === 'x') {
        handleDeleteAll();
      } else {
        const rowIndex = parseInt(e.key, 10) - 1;
        if (!isNaN(rowIndex) && currentGroup[rowIndex]) {
          handleDelete(currentGroup[rowIndex].product_id, currentGroup[rowIndex].id, currentGroup[rowIndex].title);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGroup, barcodes]);

  return (
    <div style={{ padding: '20px' }}>
      <p><strong>Duplicate Barcode Groups:</strong> {groupCount}</p>
      <h1>Duplicate Reviewer</h1>
      {currentGroup.length === 0 ? (
        <p>No duplicate products found.</p>
      ) : (
        <>
          <p><strong>Barcode:</strong> {currentBarcode}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '16px' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Title</th>
                <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Price</th>
                <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Handle</th>
                <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Synced</th>
                <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentGroup.map((product, index) => (
                <tr
                  key={product.id}
                  style={{
                    backgroundColor:
                      currentGroup.length === 1
                        ? '#f5f5f5'
                        : product.id === lowestPriceId
                        ? '#fff3cd'
                        : 'transparent',
                    opacity: currentGroup.length === 1 ? 0.6 : 1
                  }}
                >
                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>{product.title}</td>
                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>{product.variant_price}</td>
                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>{product.handle}</td>
                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>{new Date(product.last_synced_at).toLocaleString()}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(product.product_id, product.id, product.title)}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#e74c3c',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button onClick={() => setCurrentBarcodeIndex(i => Math.max(i - 1, 0))}>Previous</button>
            <button onClick={() => setCurrentBarcodeIndex(i => Math.min(i + 1, barcodes.length - 1))}>Next</button>
            <button
              style={{ backgroundColor: '#e74c3c', color: '#fff', padding: '10px 14px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              onClick={handleDeleteAll}
              disabled={deleteAllInProgress}
            >
              {deleteAllInProgress
                ? `Deleting (${deleteProgress}/${currentGroup.length})...`
                : 'Delete All on Page (⇧+X)'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default DuplicateReviewer;
