import Shopify from 'shopify-api-node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const shopify = new Shopify({
  shopName: process.env.SHOPIFY_STORE_DOMAIN,
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    console.log('Incoming POST request body:', req.body);
    const { variant_id, suggestedPrice, product_id, title, inventory_item_id, cost, barcode } = req.body;
    console.log('Incoming values:', { variant_id, suggestedPrice, product_id, title, inventory_item_id, cost, barcode });

    if (!variant_id) {
      const productData = {
        title,
        variants: [{
          price: suggestedPrice,
          inventory_management: 'shopify',
          inventory_policy: 'deny',
          requires_shipping: true,
          taxable: true,
          cost: cost || null,
          barcode: barcode || null
        }]
      };

      console.log('Creating new product with data:', productData);

      const createdProduct = await shopify.product.create(productData);
      const createdVariant = createdProduct.variants[0];
      
      try {
        await supabase
          .from('product_editor_creates')
          .insert([{
            variant_id: String(createdVariant.id),
            product_id: String(createdProduct.id),
            title: createdProduct.title,
            created_at: new Date().toISOString()
          }]);
        console.log(`Logged created product to product_editor_creates: ${createdProduct.title}`);
      } catch (logError) {
        console.error('Failed to log to product_editor_creates:', logError.message);
      }
      
      res.status(200).json({
        created: true,
        product_id: createdProduct.id,
        variant_id: createdVariant.id,
        message: `Product "${createdProduct.title}" created successfully on Shopify.`
      });
      return;
    }

    try {
      const variant = await shopify.productVariant.get(variant_id);
      
      if (variant) {
        await shopify.productVariant.update(variant_id, { price: suggestedPrice });
        console.log(`Updated variant ${variant_id} with new price: ${suggestedPrice}`);
        
        if (title && title.trim() !== '') {
          const existingProduct = await shopify.product.get(product_id);
          console.log(`Existing title for product ${product_id}: ${existingProduct.title}`);
          
          if (existingProduct.title !== title) {
            await shopify.product.update(product_id, { id: product_id, title: String(title) });
            console.log(`Updated product ${product_id} with new title: ${title}`);
          } else {
            console.log(`Skipped updating product ${product_id} as the title is unchanged.`);
          }
        }

        if (cost && inventory_item_id) {
          await shopify.inventoryItem.update(inventory_item_id, { cost });
          console.log(`Updated inventory item ${inventory_item_id} with new cost: ${cost}`);
        } else if (!inventory_item_id) {
          console.warn(`No inventory_item_id provided. Skipping cost update.`);
        }

        const updatedVariant = await shopify.productVariant.get(variant_id);
        console.log('Updated variant details:', updatedVariant);

        const { error: insertError, data: insertData } = await supabase
          .from('product_editor_changes')
          .insert([{
            variant_id: String(variant_id),
            product_id: String(product_id),
            updated_at: new Date().toISOString()
          }]);

        if (insertError) {
          console.error('Failed to log to product_editor_changes:', insertError);
        } else {
          console.log('Logged to product_editor_changes:', insertData);
        }

        res.status(200).json({ exists: true });
      } else {
        res.status(200).json({ exists: false });
      }
    } catch (error) {
      if (error.statusCode === 404) {
        res.status(200).json({ exists: false });
      } else {
        console.error('Error in POST /api/upsert-shopify-product:', error);
        if (error.response && error.response.body) {
          try {
            const body = await error.response.text();
            console.error('Response body:', body);
          } catch (e) {
            console.error('Failed to read response body:', e);
          }
        }
        res.status(500).json({ error: error.message || 'Internal Server Error' });
      }
    }
  } else if (req.method === 'GET') {
    const { barcode } = req.query;
    console.log(`Checking barcode: ${barcode}`);

    try {
      const matches = [];
      let totalMatches = 0;
      let hasNextPage = true;
      let endCursor = null;

      while (hasNextPage) {
        console.log(`Requesting page of products with endCursor: ${endCursor}`);
        const query = `
          {
            products(first: 250, after: ${endCursor ? `"${endCursor}"` : 'null'}) {
              edges {
                node {
                  title
                  variants(first: 250) {
                    edges {
                      node {
                        barcode
                        price
                      }
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `;

        const response = await shopify.graphql(query);
        console.log(`Full GraphQL response for barcode ${barcode}:`, response);
        if (response.throttleStatus) {
          const { currentlyAvailable, restoreRate } = response.throttleStatus;
          console.log(`Throttle status: available=${currentlyAvailable}, restoreRate=${restoreRate}`);
          if (currentlyAvailable < 10) {
            const delay = (10 - currentlyAvailable) * restoreRate;
            console.log(`Bucket nearly empty. Waiting for ${delay}ms before next query.`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        if (response.errors) {
          console.error('GraphQL errors:', response.errors);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }

        if (!response.products) {
          console.error(`Missing products in response for barcode ${barcode}`);
          res.status(500).json({ error: 'Malformed response structure' });
          return;
        }

        if (!response.products.edges) {
          console.error(`Missing edges in products for barcode ${barcode}`);
          res.status(500).json({ error: 'Malformed response structure' });
          return;
        }

        response.products.edges.forEach(({ node: product }) => {
          if (product.variants && product.variants.edges) {
            console.log(`Examining ${product.variants.edges.length} variants for product: ${product.title}`);
            product.variants.edges.forEach(({ node: variant }) => {
              if (variant.barcode === barcode) {
                console.log(`Matched variant for barcode ${barcode}:`, variant);
                matches.push({ product, variant });
                totalMatches++;
              }
            });
          } else {
            console.error(`Missing variants in product for barcode ${barcode}`);
          }
        });

        hasNextPage = response.products.pageInfo?.hasNextPage || false;
        endCursor = response.products.pageInfo?.endCursor || null;
      }

      console.log(`Barcode: ${barcode}, Matches found: ${totalMatches}`);

      if (matches.length === 0) {
        res.status(404).json({ message: 'Product does not exist yet. Will be created if saved.' });
      } else if (matches.length === 1) {
        const { product, variant } = matches[0];
        res.status(200).json({
          title: product.title,
          variantPrice: variant.price,
        });
      } else {
        res.status(200).json({
          message: 'Multiple products found. Please use the duplicate editor.',
        });
      }
    } catch (error) {
      console.error('Caught error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
