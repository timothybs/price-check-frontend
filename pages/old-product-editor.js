import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;   
const supabase = createClient(supabaseUrl, supabaseKey);

const ProductEditor = () => {
    const [userTapped, setUserTapped] = useState(false);
    const [barcode, setBarcode] = useState('');
    const videoRef = useRef(null);
    const inputRef = useRef(null);
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        cost: '',
        listPrice: '',
        suggestedPrice: '',
        variant_id: '', // Added variant_id to formData
        product_id: '', // Added product_id to formData
        inventory_item_id: '' // ✅ Add this line
    });
    const [shopifyData, setShopifyData] = useState(null);
    const [shopifyMessage, setShopifyMessage] = useState('');
    const [cameraError, setCameraError] = useState('');
    const [scanned, setScanned] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [inventoryQty, setInventoryQty] = useState('');

    useEffect(() => {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.removeAttribute('readonly');
          inputRef.current.focus();
        }
      }, 500);
    }, []);

    // useEffect(() => {
    //   if (typeof window !== 'undefined' && window.innerWidth < 600) {
    //     const input = document.getElementById('barcode-input');
    //     if (input) input.focus();
    //   }
    // }, []);

    useEffect(() => {
      const timeout = setTimeout(() => {
        startCameraScan();
      }, 500);
      return () => clearTimeout(timeout);
    }, []);

    const calculateSuggestedRRP = (netPrice) => {
        if (!netPrice || isNaN(netPrice)) return 0;
        return Math.ceil(netPrice * 1.6 * 1.2) - 0.05;
    };

    const calculateMargin = (suggestedRRP, netPrice) => {
        return ((suggestedRRP - netPrice) / suggestedRRP * 100).toFixed(1);
    };

    const fetchProducts = async (barcode) => {
        console.log(`Fetching products for barcode: ${barcode}`);
        const suppliers = [
            { name: 'toolbank', column: 'RetailerBarcode' },
            { name: 'home_hardware', column: 'RetailerBarcode' },
            { name: 'stax', column: 'Barcode' },
            { name: 'wilsons', column: 'ean' },
            { name: 'centurion', column: 'barcode' },
            { name: 'toolstream', column: 'barcode' }
        ];
        const allProducts = [];

        for (const { name, column } of suppliers) {
        const tableName = name === 'home_hardware' ? 'home_hardware_prices_with_discounts' : name === 'toolbank' ? 'toolbank_prices_with_discounts' : `${name}_prices`;
        let query = supabase.from(tableName).select('*');
        
        if (name === 'stax') {
            const altBarcode = barcode.replace(/^0+/, '');
            query = query.or(
                `${column}.eq.${barcode},${column}.eq.${altBarcode},${column}.eq.0${barcode},OtherBarcodes.ilike.%${barcode}%,OtherBarcodes.ilike.%${altBarcode}%,OtherBarcodes.ilike.%0${barcode}%`
            );
        } else {
            query = query.or(
                `${column}.eq.${barcode},${column}.eq.${barcode.replace(/^0+/, '')},${column}.eq.0${barcode}`
            );
        }
        
        const { data, error } = await query;
        let finalData = data || [];

            if (error) {
                console.warn(`❌ Error fetching supplier ${name}:`, error.message);
                continue;
            }
            const taggedProducts = finalData.map(product => {
                let normalizedProduct = {};
                switch (name) {
                    case 'toolbank':
                        normalizedProduct = {
                            title: product.product_name || product['Product Name'],
                            net_price: parseFloat(parseFloat(product.toolbank_actual_price).toFixed(2)) || 0
                        };
                        break;
                    case 'home_hardware':
                        normalizedProduct = {
                            title: product.Product_Name,
                            net_price: parseFloat(product.home_hardware_actual_price).toFixed(2) || 0 // Updated net price field
                        };
                        break;
                    case 'stax':
                        normalizedProduct = {
                            title: product.Title,
                            net_price: parseFloat(product.YourPrice) || 0
                        };
                        break;
                    case 'wilsons':
                        normalizedProduct = {
                            title: product.name,
                            net_price: parseFloat(product.unit_price_in_singles) || 0
                        };
                        break;
                    case 'centurion':
                        normalizedProduct = {
                            title: product.description,
                            net_price: parseFloat(product.nett_price) || 0
                        };
                        break;
                    case 'toolstream':
                        normalizedProduct = {
                            title: product.title || product.name || product.primary_description || product.description || '',
                            net_price: parseFloat(product.net_price) || 0
                        };
                        break;
                    default:
                        break;
                }
                const suggested_rrp = calculateSuggestedRRP(normalizedProduct.net_price);
                const margin = calculateMargin(suggested_rrp, normalizedProduct.net_price);
                return {
                    ...normalizedProduct,
                    supplier_name: name,
                    suggested_rrp: suggested_rrp,
                    margin: margin
                };
            });

            allProducts.push(...taggedProducts);
            console.log(`Response from supplier ${name}:`, taggedProducts);
        }

        setProducts(allProducts);
        setFormData(prevData => ({ ...prevData, suggestedPrice: '' }));
        if (allProducts.length > 0 && !formData.title) {
            setFormData(prevData => ({
                ...prevData,
                title: allProducts[0].title
            }));
        }


        // Fetching Shopify data from Supabase
        const { data: shopifyProducts, error: shopifyError } = await supabase
            .from('shopify_products')
            .select('*')
            .eq('variant_barcode', barcode);
        
        // If Shopify data exists and price is higher than all suggested RRPs, use it
        if (shopifyProducts?.length === 1) {
          const shopifyPrice = parseFloat(shopifyProducts[0].variant_price);
          const allRRPs = allProducts.map(p => p.suggested_rrp);
          const highestRRP = Math.max(...allRRPs);
          setFormData(prevData => ({
            ...prevData,
            suggestedPrice: shopifyPrice > highestRRP ? shopifyPrice.toFixed(2) : ''
          }));
        }

        if (shopifyError) {
            console.error("Error fetching Shopify products:", shopifyError.message);
            setShopifyMessage("Error fetching Shopify product data.");
            setShopifyData(null);
            return;
        }

        if (shopifyProducts.length === 1) {
            const shopifyProduct = shopifyProducts[0];
            setShopifyData({
                title: shopifyProduct.title,
                variant_price: shopifyProduct.variant_price,
                cost: shopifyProduct.cost,
                inventory_qty: shopifyProduct.variant_inventory_qty
            });
            setFormData(prevData => ({
                ...prevData,
                variant_id: shopifyProduct.variant_id,
                product_id: shopifyProduct.product_id,
                inventory_item_id: shopifyProduct.inventory_item_id,
                title: shopifyProduct.title || '',
                cost: shopifyProduct.cost || '',
                suggestedPrice: shopifyProduct.variant_price?.toFixed(2) || ''
              }));
            setInventoryQty(shopifyProduct.variant_inventory_qty);
            setShopifyMessage('');
        } else if (shopifyProducts.length === 0) {
            setShopifyMessage('This product does not yet exist in Shopify.');
            setShopifyData(null);
        } else {
            setShopifyMessage(`Warning: Duplicate products found. <a href="/duplicate-editor?barcode=${barcode}">Edit duplicates</a>`);
            setShopifyData(null);
        }
        if (typeof window !== 'undefined') {
          window.__formData = {
            ...formData,
            variant_id: shopifyProducts?.[0]?.variant_id || '',
            product_id: shopifyProducts?.[0]?.product_id || '',
            inventory_item_id: shopifyProducts?.[0]?.inventory_item_id || '',
            inventoryQty: shopifyProducts?.[0]?.variant_inventory_qty || ''
          };
        }
    };

    const handleBarcodeChange = (e) => {
    setBarcode(e.target.value);
    setScanned(true);
    if (e.target.value.length === 13) {
        fetchProducts(e.target.value);
    }
    };

    const handleBarcodeKeyPress = (e) => {
    if (e.key === 'Enter' && barcode.length >= 3) {
        fetchProducts(barcode);
        setScanned(true);
    }
    };

    const handleSearchClick = () => {
        if (barcode.length >= 3) {
            fetchProducts(barcode);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleUseThisClick = (product) => {
        setFormData(prevData => ({
            ...prevData,
            title: product.title
        }));
    };

    const handleSetPricingClick = (product) => {
        const suggestedPrice = calculateSuggestedRRP(product.net_price);
        const roundedPrice = suggestedPrice.toFixed(2);
        setFormData({
            title: formData.title,
            cost: product.net_price,
            listPrice: '',
            suggestedPrice: roundedPrice,
            variant_id: formData.variant_id, // Ensure variant_id is retained
            product_id: formData.product_id, // Ensure product_id is retained
            inventory_item_id: formData.inventory_item_id // ✅ Preserve inventory_item_id
        });
    };

    const handleSave = async () => {
        if (!formData.variant_id && !confirm("No Variant ID entered. Do you want to create a new Shopify product?")) {
            return; // Abort the save operation if the user cancels
        }
        setStatusMessage(formData.variant_id ? 'Updating product…' : 'Creating product…');
        console.log(formData);
        const costToSend = parseFloat(formData.cost); // Ensure cost is numeric
        console.log(`Sending cost: ${costToSend}, inventory_item_id: ${formData.variant_id}`);
        if (typeof window !== 'undefined') {
          console.log('💾 Saving with formData:', formData);
          window.__formData = formData;
          window.__inventoryQty = inventoryQty;
        }
        try {
            const response = await fetch('/api/upsert-shopify-product', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            body: JSON.stringify({ ...formData, cost: costToSend, barcode, inventoryQty: parseInt(inventoryQty), inventory_item_id: formData.inventory_item_id }), // Send numeric cost
            });
            const result = await response.json();
            if (result.message) setStatusMessage(result.message);
            console.log(result);
            setTimeout(() => setStatusMessage(''), 3000);
            
            // Update variant_price and title in shopify_products table when saving an existing product
            if (formData.variant_id) {
                const { data: updateData, error: updateError } = await supabase
                    .from('shopify_products')
                    .update({
                        variant_inventory_qty: parseInt(inventoryQty),
                        variant_price: parseFloat(formData.suggestedPrice),
                        title: formData.title
                    })
                    .eq('variant_id', formData.variant_id);
                if (updateError) {
                    console.error("Error updating shopify_products:", updateError);
                }
            }

            console.log("📝 Logging to product_editor_changes:", formData);
            // Insert a record into product_editor_changes
            try {
                await supabase
                    .from('product_editor_changes')
                    .insert({
                        variant_id: formData.variant_id,
                        product_id: formData.product_id,
                        changes: {
                            title: formData.title,
                            cost: formData.cost,
                            listPrice: formData.listPrice,
                            suggestedPrice: formData.suggestedPrice,
                            variant_id: formData.variant_id,
                            product_id: formData.product_id,
                            inventoryQty: inventoryQty
                        }
                    });
                console.log("Insert into product_editor_changes was successful.");
            } catch (insertError) {
                console.error("Error inserting into product_editor_changes:", insertError);
            }
            if (formData.variant_id) {
              await supabase
                .from('shopify_products')
                .update({ variant_inventory_qty: parseInt(inventoryQty) })
                .eq('variant_id', formData.variant_id);
            }

        } catch (error) {
            console.error("Error updating Shopify product:", error);
        }
    };

    const handleReset = () => {
      setScanned(false);
      setBarcode('');
      setProducts([]);
      setFormData({
        title: '',
        cost: '',
        listPrice: '',
        suggestedPrice: '',
        variant_id: '',
        product_id: '',
        inventory_item_id: '' // ✅ Add this line
      });
      setShopifyData(null);
      setShopifyMessage('');
      setCameraError('');

      setTimeout(() => {
        const input = document.getElementById('barcode-input');
        if (input) {
          input.focus();
        }
        startCameraScan();
      }, 100);
    };

    const startCameraScan = async () => {
      if (!videoRef.current) {
        console.warn("Video element not yet ready.");
        return;
      }
      setIsScanning(true);
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
      ]);
 
      const codeReader = new BrowserMultiFormatReader(hints);
      try {
      codeReader.decodeFromConstraints({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16 / 9 }
        }
      }, 'video-preview', (result, error) => {
        if (result) {
          const scannedBarcode = result.getText();
          console.log('Scanned barcode:', scannedBarcode);
          setScanned(true);
          setBarcode(scannedBarcode);
          fetchProducts(scannedBarcode);
          setIsScanning(false);
          codeReader.reset(); // stop scanning after successful read
        }
      });
      } catch (err) {
        console.error('Camera access error:', err);
        setCameraError('Unable to access camera. Please check permissions and try Safari.');
      }
    };

    return (
        <div style={{ padding: '20px', fontSize: '18px' }}>
            <h1>Product Editor</h1>
            <div className="scanner-row">
              <input
                ref={inputRef}
                id="barcode-input"
                type="text"
                value={barcode}
                onChange={handleBarcodeChange}
                onKeyPress={handleBarcodeKeyPress}
                autoFocus
                inputMode="none"
                autoComplete="off"
                autoCorrect="off"
                readOnly={!userTapped}
                onTouchStart={() => setUserTapped(true)}
                placeholder="Enter barcode"
                style={{ width: '50%', padding: '15px', fontSize: '18px' }}
              />
              {!scanned && !cameraError && (
                <div style={{ width: '45%' }}>
                  <div style={{ position: 'relative' }}>
                    <video ref={videoRef} id="video-preview" style={{ width: '100%', maxHeight: '400px', marginBottom: '5px' }} />
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleSearchClick} style={{ padding: '15px', fontSize: '18px' }}>Search</button>
            {cameraError && <p style={{ color: 'red' }}>{cameraError}</p>}
            <button onClick={handleReset} style={{ padding: '10px', fontSize: '16px', marginBottom: '20px', marginLeft: '10px' }}>
              Reset
            </button>
            {scanned && (
              <button onClick={startCameraScan} style={{ padding: '10px', fontSize: '16px', marginBottom: '20px', marginLeft: '10px' }}>
                Rescan
              </button>
            )}
            {shopifyMessage && <p dangerouslySetInnerHTML={{ __html: shopifyMessage }}></p>}
            {shopifyData && (
                <div>
                    <h2>Shopify Product Details</h2>
                    <p>Title: {shopifyData.title}</p>
                    <p>Variant Price: {shopifyData.variant_price}</p>
                    <p>Cost: {shopifyData.cost}</p>
                    <p>Inventory Qty: {shopifyData.inventory_qty}</p>
                </div>
            )}
            {products.length > 0 ? (
                <div>
                    <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
                        <thead>
                        <tr>
                        <th>Title</th>
                        <th style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>Supplier</th>
                        <th style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>Net Price</th>
                        <th style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>RRP</th>
                        <th style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>Margin %</th>
                        <th style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>Action</th>
                        </tr>
                        </thead>
                        <tbody>
                            {products.map((product, index) => (
                            <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fafafa' : '#ffffff' }}>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.title}</td>
                                    <td style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>{product.supplier_name}</td>
                                    <td style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>{product.net_price}</td>
                                    <td style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>{product.suggested_rrp.toFixed(2)}</td>
                                    <td style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>{product.margin}</td>
                                    <td style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>
                                        <button onClick={() => handleUseThisClick(product)} style={{ padding: '16px 24px', fontSize: '18px', margin: '6px' }}>Select Title</button>
                                        <button onClick={() => handleSetPricingClick(product)} style={{ padding: '16px 24px', fontSize: '18px', margin: '6px' }}>Select Price</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div>
                        <h2>Selected Product Details</h2>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            style={{ width: '100%', padding: '10px', fontSize: '16px', marginBottom: '10px' }}
                        />
                        <input
                            type="text"
                            name="variant_id" // Added variant_id input field
                            value={formData.variant_id}
                            onChange={handleInputChange}
                            placeholder="Variant ID (optional)"
                            style={{ width: '100%', padding: '10px', fontSize: '16px', marginBottom: '10px' }}
                        />
                        <input
                            type="text"
                            name="product_id" // Added product_id input field
                            value={formData.product_id}
                            onChange={handleInputChange}
                            placeholder="Product ID (optional)"
                            style={{ width: '100%', padding: '10px', fontSize: '16px', marginBottom: '10px' }}
                        />
                        <input
                            type="number"
                            name="cost"
                            value={formData.cost}
                            onChange={handleInputChange}
                            placeholder="Cost"
                            style={{ width: '100%', padding: '10px', fontSize: '16px', marginBottom: '10px' }}
                        />
                        <input
                            type="number"
                            name="listPrice"
                            value={formData.listPrice}
                            onChange={handleInputChange}
                            placeholder="List Price"
                            style={{ width: '100%', padding: '10px', fontSize: '16px', marginBottom: '10px' }}
                        />
                        <input
                            type="number"
                            name="suggestedPrice"
                            value={formData.suggestedPrice}
                            onChange={handleInputChange}
                            placeholder="Suggested Price"
                            style={{ width: '100%', padding: '10px', fontSize: '16px', marginBottom: '10px' }}
                        />
                        <div style={{ marginTop: '20px' }}>
                          <label style={{ fontWeight: 'bold' }}>Inventory Quantity</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                            <button onClick={() => setInventoryQty(qty => Math.max(0, Number(qty) - 1))} style={{ padding: '10px 14px', fontSize: '18px' }}>−</button>
                            <input
                              type="number"
                              value={inventoryQty}
                              onChange={(e) => setInventoryQty(e.target.value)}
                              style={{ width: '80px', textAlign: 'center', fontSize: '18px', padding: '10px' }}
                            />
                            <button onClick={() => setInventoryQty(qty => Number(qty) + 1)} style={{ padding: '10px 14px', fontSize: '18px' }}>+</button>
                          </div>
                        </div>
                    </div>
                </div>
            ) : (
                <p>No products found.</p>
            )}
            {statusMessage && <p style={{ color: 'green' }}>{statusMessage}</p>}
            <p style={{ fontSize: '14px', color: '#555', marginTop: '10px' }}>
              <strong>Note:</strong> Product creations are fairly instant. Product updates can take up to 5 minutes to sync.
            </p>
           <center><button onClick={handleSave} style={{ padding: '15px', fontSize: '18px', marginTop: '20px' }}>Save</button></center>
           <div style={{ marginTop: '60px', textAlign: 'center' }}>
             <button onClick={() => window.location.href = '/'} style={{ margin: '5px', padding: '10px 20px' }}>Home</button>
             <button onClick={() => window.location.href = '/priceandcount'} style={{ margin: '5px', padding: '10px 20px' }}>Price & Count</button>
             <button onClick={() => window.location.href = '/product-editor'} style={{ margin: '5px', padding: '10px 20px' }}>Product Editor</button>
           </div>
       <style jsx>{`
         .scanner-row {
           display: flex;
           gap: 10px;
           align-items: flex-start;
           margin-bottom: 10px;
         }
 
         @media (max-width: 600px) {
           .scanner-row {
             flex-direction: column;
           }
 
           .scanner-row input {
             width: 100% !important;
           }
 
           .scanner-row video {
             max-height: 90vh;
           }
  
           table {
             font-size: 14px;
           }
  
           th, td {
             padding: 6px !important;
           }
  
           button {
             font-size: 16px;
             padding: 10px;
           }
         }

         .product-details {
           display: flex;
           flex-direction: column;
           gap: 10px;
         }

         @media (max-width: 600px) {
           .product-details input {
             font-size: 14px !important;
             padding: 8px !important;
           }

           .product-details {
             gap: 6px;
           }

           .product-details p {
             font-size: 14px;
           }

           .product-details h2 {
             font-size: 16px;
             margin-bottom: 5px;
           }
         }
         @media (max-width: 600px) {
           th:nth-child(2),
           td:nth-child(2),
           th:nth-child(3),
           td:nth-child(3),
           th:nth-child(5),
           td:nth-child(5) {
             display: none;
           }
         }
       `}</style>
       </div>
    );
};

export default ProductEditor;