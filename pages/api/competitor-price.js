

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { barcode } = req.query;

  if (!barcode) {
    return res.status(400).json({ error: 'Missing barcode' });
  }

  const auth = Buffer.from(`${process.env.SMARTPROXY_API_USER}:${process.env.SMARTPROXY_API_KEY}`).toString('base64');
  const smartproxyUrl = 'https://scraper-api.smartproxy.com/v2/scrape';
  const diyUrl = `https://www.diy.com/search?term=${barcode}`;

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

  const priceMatch = html.match(/data-testid="product-price"[^>]*>([^<]+)<\/span>/i);
  if (!priceMatch) return res.status(404).json({ error: 'Price not found' });

  const rawPrice = priceMatch[1].replace(',', '').trim();
  const numeric = rawPrice.match(/([0-9]+(?:\.[0-9]+)?)/);
  const price = numeric ? parseFloat(numeric[1]) : null;

  const image_url = `https://media.diy.com/is/image/KingfisherDigital/${barcode}_01c_MP`;

  res.status(200).json({
    barcode,
    price,
    image_url,
    competitor_url: diyUrl
  });
}