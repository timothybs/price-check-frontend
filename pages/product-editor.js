import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;   
const supabase = createClient(supabaseUrl, supabaseKey);

const ProductEditor = () => {
    const [barcode, setBarcode] = useState('');
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        cost: '',
        listPrice: '',
        suggestedPrice: '',
        variant_id: '', // Added variant_id to formData
        product_id: '' // Added product_id to formData
    });
    const [shopifyData, setShopifyData] = useState(null);
    const [shopifyMessage, setShopifyMessage] = useState('');

    useEffect(() => {
        const input = document.getElementById('barcode-input');
        if (input) {
            input.focus();
        }
    }, [products]);

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
            { name: 'centurion', column: 'barcode' }
        ];
        const allProducts = [];

        for (const { name, column } of suppliers) {
        const tableName = name === 'home_hardware' ? 'home_hardware_prices_with_discounts' : `${name}_prices`;
        const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .eq(column, barcode);

            if (error) {
                console.warn(`❌ Error fetching supplier ${name}:`, error.message);
                continue;
            }

            const taggedProducts = data.map(product => {
                let normalizedProduct = {};
                switch (name) {
                    case 'toolbank':
                        normalizedProduct = {
                            title: product.Product_Name,
                            net_price: parseFloat(product.CurrentListPrice) || 0
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
        if (allProducts.length > 0) {
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
                cost: shopifyProduct.cost
            });
            setFormData(prevData => ({
                ...prevData,
                variant_id: shopifyProduct.variant_id, // Store variant_id in formData
                product_id: shopifyProduct.product_id // Store product_id in formData
            }));
            setShopifyMessage('');
        } else if (shopifyProducts.length === 0) {
            setShopifyMessage('This product does not yet exist in Shopify.');
            setShopifyData(null);
        } else {
            setShopifyMessage('Warning: Duplicate products found. <a href="/duplicate-editor">Edit duplicates</a>');
            setShopifyData(null);
        }
    };

    const handleBarcodeChange = (e) => {
        setBarcode(e.target.value);
        if (e.target.value.length === 13) {
            fetchProducts(e.target.value);
        }
    };

    const handleBarcodeKeyPress = (e) => {
        if (e.key === 'Enter' && barcode.length >= 3) {
            fetchProducts(barcode);
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
            product_id: formData.product_id // Ensure product_id is retained
        });
    };

    const handleSave = async () => {
        if (!formData.variant_id && !confirm("No Variant ID entered. Do you want to create a new Shopify product?")) {
            return; // Abort the save operation if the user cancels
        }
        console.log(formData);
        const costToSend = parseFloat(formData.cost); // Ensure cost is numeric
        console.log(`Sending cost: ${costToSend}, inventory_item_id: ${formData.variant_id}`);
        try {
            const response = await fetch('/api/upsert-shopify-product', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...formData, cost: costToSend }), // Send numeric cost
            });
            const result = await response.json();
            console.log(result);

            console.log("📝 Logging to product_editor_changes:", formData);
            // Insert a record into product_editor_changes
            try {
                await supabase
                    .from('product_editor_changes')
                    .insert({
                        variant_id: formData.variant_id,
                        product_id: formData.product_id,
                        changes: formData // Include any other relevant changes if necessary
                    });
                console.log("Insert into product_editor_changes was successful.");
            } catch (insertError) {
                console.error("Error inserting into product_editor_changes:", insertError);
            }

        } catch (error) {
            console.error("Error updating Shopify product:", error);
        }
    };

    return (
        <div style={{ padding: '20px', fontSize: '18px' }}>
            <h1>Product Editor</h1>
            <input
                id="barcode-input"
                type="text"
                value={barcode}
                onChange={handleBarcodeChange}
                onKeyPress={handleBarcodeKeyPress}
                autoFocus
                placeholder="Enter barcode"
                style={{ width: '100%', padding: '15px', fontSize: '18px', marginBottom: '10px' }}
            />
            <button onClick={handleSearchClick} style={{ padding: '15px', fontSize: '18px' }}>Search</button>
            {shopifyMessage && <p dangerouslySetInnerHTML={{ __html: shopifyMessage }}></p>}
            {shopifyData && (
                <div>
                    <h2>Shopify Product Details</h2>
                    <p>Title: {shopifyData.title}</p>
                    <p>Variant Price: {shopifyData.variant_price}</p>
                    <p>Cost: {shopifyData.cost}</p>
                </div>
            )}
            {products.length > 0 ? (
                <div>
                    <table style={{ width: '100%', marginTop: '20px' }}>
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Supplier</th>
                                <th>Net Price</th>
                                <th>Suggested RRP</th>
                                <th>Margin %</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product, index) => (
                                <tr key={index}>
                                    <td>{product.title}</td>
                                    <td>{product.supplier_name}</td>
                                    <td>{product.net_price}</td>
                                    <td>{product.suggested_rrp.toFixed(2)}</td>
                                    <td>{product.margin}</td>
                                    <td>
                                        <button onClick={() => handleUseThisClick(product)} style={{ padding: '10px', fontSize: '16px' }}>Select Title</button>
                                        <button onClick={() => handleSetPricingClick(product)} style={{ padding: '10px', fontSize: '16px' }}>Set pricing from this supplier</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div>
                        <h2>Selected Product Details</h2>
                        <p>Title: {formData.title}</p>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            readOnly
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
                    </div>
                </div>
            ) : (
                <p>No products found.</p>
            )}
            <button onClick={handleSave} style={{ padding: '15px', fontSize: '18px', marginTop: '20px' }}>Save</button>
       </div>
    );
};

export default ProductEditor;
