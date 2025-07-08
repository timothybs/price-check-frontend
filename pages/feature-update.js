export default function FeatureUpdatePage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <a href="/" style={{ color: '#555', textDecoration: 'none', fontSize: '14px' }}>← Home</a>
        <a href="/product-editor-competitor" style={{ color: '#555', textDecoration: 'none', fontSize: '14px' }}>Product Editor →</a>
      </div>

      <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '24px' }}>🆕 Feature Updates — Session Summary (9 May 2025)</h1>

      <h2 style={{ fontSize: '18px', marginTop: '24px' }}>🛒 Product Editor Improvements</h2>
      <ul>
        <li>You can now search Centurion products using their product codes, not just barcodes. 
            <strong>You can try this with "CH150" for the chap's hinge.</strong></li>
        <li>If Centurion has a barcode for a product, it'll auto-fill into the product editor.</li>
        <li>If nothing is found for a scanned barcode, you can still create the product manually.</li>
        <li>The "variant barcode" field is now visible and gets saved to both Shopify and Supabase.</li>
      </ul>

      <h2 style={{ fontSize: '18px', marginTop: '24px' }}>💾 Save & Reload Flow</h2>
      <ul>
        <li>After saving, the page reloads with the barcode so you can confirm it saved correctly.</li>
        <li>Save button now shows a "Saving..." indicator while the save is processing.</li>
      </ul>

      <h2 style={{ fontSize: '18px', marginTop: '24px' }}>📊 Supplier vs Competitor Info</h2>
      <ul>
        <li>Product info is now split into two sections: <strong>Supplier Info</strong> and <strong>Competitor Info</strong>.</li>
        <li>Competitor data loads in the background and shows a loading message while it fetches.</li>
        <li>You can still select title/price from competitors just like suppliers.</li>
      </ul>

      <h2 style={{ fontSize: '18px', marginTop: '24px' }}>🧹 Duplicate Editor Updates</h2>
      <ul>
        <li>Duplicates now show in mobile-friendly card layouts instead of a wide table.</li>
        <li>The cheapest product among duplicates is recommended for deletion.</li>
        <li>After deleting a duplicate, you're redirected to the correct product editor view.</li>
      </ul>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
        <a href="/" style={{ color: '#555', textDecoration: 'none', fontSize: '14px' }}>← Home</a>
        <a href="/product-editor-competitor" style={{ color: '#555', textDecoration: 'none', fontSize: '14px' }}>Product Editor →</a>
      </div>
    </div>
  );
}
