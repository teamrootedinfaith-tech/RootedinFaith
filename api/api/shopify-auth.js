import crypto from 'crypto';
 
// ── Helpers ───────────────────────────────────────────────
 
function signToken(payload, secret) {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body    = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig     = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}
 
async function getShopifyCustomer(email, shop, token) {
  const query = `
    query getCustomer($email: String!) {
      customers(first: 1, query: $email) {
        edges {
          node {
            id
            email
            tags
          }
        }
      }
    }
  `;
 
  const r = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type':           'application/json',
      'X-Shopify-Access-Token': token
    },
    body: JSON.stringify({ query, variables: { email: `email:${email}` } })
  });
 
  const data = await r.json();
  const edges = data?.data?.customers?.edges;
  return edges?.length ? edges[0].node : null;
}
 
// ── Handler ───────────────────────────────────────────────
 
export default async function handler(req, res) {
  // Allow both GET (email link) and POST (store button)
  const email = (req.method === 'GET' ? req.query.email : req.body?.email)?.toLowerCase()?.trim();
 
  if (!email) {
    return res.status(400).send('Missing email parameter.');
  }
 
  const shop           = process.env.SHOPIFY_STORE_DOMAIN;     // e.g. your-store.myshopify.com
  const adminToken     = process.env.SHOPIFY_ADMIN_TOKEN;      // Shopify Admin API token
  const memberTag      = process.env.CONJURED_MEMBER_TAG;      // e.g. "conjured-member" or your plan tag
  const jwtSecret      = process.env.JWT_SECRET;               // Any random 32+ char string
  const appUrl         = process.env.APP_URL;                  // e.g. https://rootedin-faith.vercel.app
  const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;       // e.g. https://your-store.com/memberships
 
  // Verify Shopify customer + Conjured membership tag
  let customer;
  try {
    customer = await getShopifyCustomer(email, shop, adminToken);
  } catch(e) {
    console.error('Shopify API error:', e);
    return res.status(500).send('Failed to verify membership. Please try again.');
  }
 
  if (!customer) {
    return res.redirect(`${shopifyStoreUrl}?error=no_account`);
  }
 
  const tags = customer.tags || [];
  const isActiveMember = tags.some(tag =>
    tag.toLowerCase() === memberTag.toLowerCase()
  );
 
  if (!isActiveMember) {
    // Not an active member — send them to purchase
    return res.redirect(`${shopifyStoreUrl}?error=no_membership`);
  }
 
  // ✓ Active member — issue a short-lived signed token (15 min)
  const payload = {
    email,
    shopify_id: customer.id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (15 * 60)  // 15 minutes
  };
 
  const token = signToken(payload, jwtSecret);
 
  // Redirect to app with token — app will auto-login
  return res.redirect(`${appUrl}/?token=${token}`);
}
