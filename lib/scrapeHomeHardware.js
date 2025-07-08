import fs from 'fs';
export default async function scrapeHomeHardware(barcode) {
  const auth = Buffer.from(`${process.env.SMARTPROXY_API_USER}:${process.env.SMARTPROXY_API_KEY}`).toString('base64');
  const smartproxyUrl = 'https://scraper-api.smartproxy.com/v2/scrape';
  const searchUrl = `https://homehardwaredirect.co.uk/search.php?search_query=${barcode}`;

  try {
    // Step 1: Load the search results page and find first product URL
    const searchResponse = await fetch(smartproxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({ url: searchUrl })
    });

    const searchData = await searchResponse.json();
    const searchHtml = searchData?.results?.[0]?.content || '';

    const allLinks = [...searchHtml.matchAll(/<a[^>]+href=["'](https:\/\/homehardwaredirect\.co\.uk\/[^"']+\?[^"']*)["']/gi)];
    const productPathMatch = allLinks.find(m => !m[1].includes('search.php'));
    if (!productPathMatch) {
      return {
        price: null,
        competitor_url: searchUrl,
        title: null
      };
    }

    const productUrl = productPathMatch[1];
    console.log('🔍 Visiting product URL:', productUrl);

    // Step 2: Load the product page and extract title/price
    const productResponse = await fetch(smartproxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({ url: productUrl })
    });

    const productData = await productResponse.json();
    const html = productData?.results?.[0]?.content || '';

    const titleMatch = html.match(/<h1[^>]*class=["']productView-title["'][^>]*>(.*?)<\/h1>/is);
    const priceMatch = html.match(/<span[^>]*class=["']price price--withTax["'][^>]*>[^<£]*£([\d.,]+)/is);

    console.log('🔍 Title match:', titleMatch?.[1]);
    console.log('🔍 Price match:', priceMatch?.[1]);

    const title = titleMatch ? titleMatch[1].trim() : null;
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : null;

    return {
      title,
      price,
      competitor_url: productUrl
    };
  } catch (err) {
    console.error(`❌ scrapeHomeHardware failed for ${barcode}:`, err.message);
    return {
      title: null,
      price: null,
      competitor_url: searchUrl
    };
  }
}