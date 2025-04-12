import Shopify from 'shopify-api-node';

const shopify = new Shopify({
  shopName: process.env.SHOPIFY_STORE_DOMAIN,
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { variantId, price } = req.body;

    try {
      const variant = await shopify.productVariant.get(variantId);
      
      if (variant) {
        await shopify.productVariant.update(variantId, { price });
        res.status(200).json({ exists: true });
      } else {
        res.status(200).json({ exists: false });
      }
    } catch (error) {
      if (error.statusCode === 404) {
        res.status(200).json({ exists: false });
      } else {
        res.status(500).json({ error: 'Internal Server Error' });
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
