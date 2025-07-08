import { createClient } from '@supabase/supabase-js';
import { load } from 'cheerio';

export default async function scrapeDIY(barcode) {
  const auth = Buffer.from(`${process.env.SMARTPROXY_API_USER}:${process.env.SMARTPROXY_API_KEY}`).toString('base64');
  const smartproxyUrl = 'https://scraper-api.smartproxy.com/v2/scrape';
  const diyUrl = `https://www.diy.com/search?term=${barcode}`;

  try {
    const response = await fetch(smartproxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({ url: diyUrl })
    });

    const data = await response.json();
    const html = data?.results?.[0]?.content || '';

    console.log('🔍 Contains seller section:', html.includes('data-testid="seller"'));
    console.log('🔍 HTML Preview:', html.slice(0, 20000));

    const $ = load(html);

    const priceMatch = html.match(/data-testid="product-price"[^>]*>([^<]+)<\/span>/i);
    if (!priceMatch) return { price: null, competitor_url: diyUrl, title: null };

    const rawPrice = priceMatch[1].replace(',', '').trim();
    const numeric = rawPrice.match(/([0-9]+(?:\.[0-9]+)?)/);
    const price = numeric ? parseFloat(numeric[1]) : null;

    let sellerText = $('[data-testid="seller"]').text().trim();
    sellerText = sellerText.replace(/Available online only.*$/, '').trim();
    const seller = sellerText.toLowerCase().includes('b&q')
      ? 'B&Q'
      : sellerText
        ? 'Other Seller'
        : 'Unknown Seller';

    console.log('🔍 Seller text:', sellerText);

    return {
      price,
      competitor_url: diyUrl,
      title: `DIY.com (${sellerText})`
    };
  } catch (err) {
    console.error(`❌ scrapeDIY failed for ${barcode}:`, err.message);
    return {
      price: null,
      competitor_url: diyUrl,
      title: null
    };
  }
}