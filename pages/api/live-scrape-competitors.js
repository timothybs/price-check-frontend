import scrapeDIY from '../../lib/scrapers/scrapeDiy';
import scrapeHomeHardware from '../../lib/scrapeHomeHardware';

const scraperMap = {
  diy: scrapeDIY,
  homehardware: scrapeHomeHardware
};

export default async function handler(req, res) {
  const { barcode, competitor = 'diy' } = req.query;

  if (!barcode || !scraperMap[competitor]) {
    return res.status(400).json({ error: 'Missing barcode or unknown competitor' });
  }

  try {
    const result = await scraperMap[competitor](barcode);
    res.status(200).json(result);
  } catch (err) {
    console.error(`❌ Error scraping ${competitor}:`, err.message);
    res.status(500).json({ error: err.message });
  }
}