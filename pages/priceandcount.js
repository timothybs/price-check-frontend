import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

const PriceAndCount = () => {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState(null);
  const [inventoryQty, setInventoryQty] = useState('');
  const [status, setStatus] = useState('');
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const videoRef = useRef(null);
  const inputRef = useRef(null);
  const lastScannedRef = useRef('');

  const fetchProductFromShopify = async (scannedBarcode) => {
    if (!scannedBarcode) return;
    lastScannedRef.current = scannedBarcode;

    const { data, error } = await supabase
      .from('shopify_products')
      .select('*')
      .eq('variant_barcode', scannedBarcode);

    if (error) {
      console.error('Supabase fetch error:', error);
      return;
    }
    
    if (data.length > 1) {
      window.location.href = `/duplicate-editor?barcode=${scannedBarcode}`;
      return;
    }

    if (data.length === 1) {
      const found = data[0];
      
      if (product && product.variant_id === found.variant_id) {
        setInventoryQty(prev => Math.max(1, Number(prev) + 1));
      } else {
        setProduct(found);
        setInventoryQty(Number(found.variant_inventory_qty) || 0);
      }
      
      setStatus('');
      setTimeout(() => {
        lastScannedRef.current = '';
      }, 500);
    } else {
      setProduct(null);
      setInventoryQty('');
      setStatus('Product not found.');
    }
  };

  const handleSave = async () => {
    if (!product?.variant_id) {
      setStatus('No variant ID found. Cannot update.');
      return;
    }

    const response = await fetch('/api/upsert-shopify-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variant_id: product.variant_id,
        product_id: product.product_id,
        inventory_item_id: product.inventory_item_id,
        inventoryQty: parseInt(inventoryQty),
        source: 'priceandcount'
      })
    });

    const result = await response.json();
    if (result.message) {
      setStatus(result.message);
    } else {
      setStatus('Saved.');
    }
  };

  const handleBarcodeInput = (e) => {
    const value = e.target.value;
    const trimmed = value.slice(0, 13);
    setBarcode(trimmed);
    if (trimmed.length >= 12) {
      fetchProductFromShopify(trimmed);
    }
  };

  const startCameraScan = async () => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.CODE_128]);

    try {
      const codeReader = new BrowserMultiFormatReader(hints);
      const videoElement = videoRef.current;
      if (videoElement) {
        videoElement.setAttribute('playsinline', true);
        videoElement.setAttribute('autoplay', true);
        videoElement.setAttribute('muted', true);
      }
      
      await codeReader.decodeFromVideoDevice(
        undefined, // use default camera
        videoRef.current,
        (result, error) => {
          if (result) {
            const scanned = result.getText().replace(/[^0-9]/g, '').slice(0, 13);
            setBarcode(scanned);
            fetchProductFromShopify(scanned);
          }
        }
      );
    } catch (err) {
      console.warn('📷 Camera access blocked or unavailable:', err);
      setCameraAvailable(false);
    }
  };

  useEffect(() => {
    startCameraScan();
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      backgroundColor: '#fff',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        fontSize: '18px',
        paddingBottom: '80px',
        textAlign: 'center'
      }}>
        <input
          ref={inputRef}
          id="barcode-input"
          value={barcode}
          onChange={handleBarcodeInput}
          placeholder="Scan or enter barcode"
          inputMode="none"
          autoComplete="off"
          autoCorrect="off"
          onFocus={(e) => {
            if (/Android/.test(navigator.userAgent)) {
              e.target.setAttribute('readonly', 'readonly');
              setTimeout(() => e.target.removeAttribute('readonly'), 100);
            }
          }}
          style={{ width: '100%', padding: '10px', fontSize: '18px' }}
        />
        {cameraAvailable && !product && (
          <div style={{ marginTop: '10px' }}>
            <video
              ref={videoRef}
              id="video-preview"
              autoPlay
              muted
              playsInline
              style={{ width: '100%', maxHeight: '300px' }}
            />
          </div>
        )}

        {product && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p style={{ fontSize: '24px', marginBottom: '12px', fontWeight: 'bold' }}>{product.title}</p>
            <p style={{ fontSize: '24px', marginBottom: '20px' }}>£{product.variant_price}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
              <button onClick={() => setInventoryQty(q => Math.max(0, Number(q) - 1))} style={{ fontSize: '24px', padding: '16px 32px' }}>−</button>
              <input
                type="number"
                value={inventoryQty}
                onChange={(e) => setInventoryQty(e.target.value)}
                style={{ width: '100px', fontSize: '24px', textAlign: 'center', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc' }}
              />
              <button onClick={() => setInventoryQty(q => Number(q) + 1)} style={{ fontSize: '24px', padding: '16px 32px' }}>+</button>
            </div>
            <button
              onClick={handleSave}
              style={{
                fontSize: '24px',
                padding: '16px 32px',
                marginTop: '30px',
                display: 'block',
                marginLeft: 'auto',
                marginRight: 'auto',
                width: '80%',
                maxWidth: '400px',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)'
              }}
            >
              Save
            </button>
          </div>
        )}

        {status && <p style={{ color: 'green', marginTop: '15px' }}>{status}</p>}
        <div style={{ marginTop: '60px', textAlign: 'center' }}>
          <button onClick={() => window.location.href = '/'} style={{ margin: '5px', padding: '10px 20px' }}>Home</button>
          <button onClick={() => window.location.href = '/priceandcount'} style={{ margin: '5px', padding: '10px 20px' }}>Price & Count</button>
          <button onClick={() => window.location.href = '/product-editor'} style={{ margin: '5px', padding: '10px 20px' }}>Product Editor</button>
        </div>
      </div>
    </div>
  );
};

export default PriceAndCount;