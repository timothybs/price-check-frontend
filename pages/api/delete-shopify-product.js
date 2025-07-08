import Shopify from 'shopify-api-node';
import { createClient } from '@supabase/supabase-js';

const shopify = new Shopify({
  shopName: process.env.SHOPIFY_STORE_DOMAIN,
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;   
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log("Incoming delete request body:", req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { product_id } = req.body;

  if (!product_id) {
    return res.status(400).json({ error: 'Missing product_id' });
  }

  try {
    await supabase
      .from('shopify_products')
      .delete()
      .eq('product_id', product_id);
    
    await shopify.product.delete(product_id);
    res.status(200).json({ message: `Deleted product ${product_id}` });
  } catch (error) {
    console.error('Error deleting Shopify product:', error);
    res.status(500).json({ error: error.message || 'Failed to delete product' });
  }
}
