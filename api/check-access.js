const ACTIVE_STATUSES = ['active', 'trialing', 'trial', 'past_due'];

function findSubscriptionStatuses(node, found) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) findSubscriptionStatuses(item, found);
    return;
  }
  for (const [key, val] of Object.entries(node)) {
    if (
      (key === 'status' || key === 'state' || key === 'subscription_status') &&
      typeof val === 'string'
    ) {
      found.push(val.toLowerCase());
    }
    if (typeof val === 'object') findSubscriptionStatuses(val, found);
  }
}

async function checkPaysight(email) {
  const apiKey  = process.env.PAYSIGHT_API_KEY;
  const baseUrl = (process.env.PAYSIGHT_API_URL || 'https://api.paysight.io/v1').replace(/\/$/, '');
  const path    = (process.env.PAYSIGHT_LOOKUP_PATH || '/customers?email={email}')
                    .replace('{email}', encodeURIComponent(email));

  const r = await fetch(baseUrl + path, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json'
    }
  });

  if (!r.ok) throw new Error(`Paysight API ${r.status}`);
  const data = await r.json();

  const statuses = [];
  findSubscriptionStatuses(data, statuses);

  if (!statuses.length) return { active: false, source: 'paysight', reason: 'no subscription found' };

  const active = statuses.some(s => ACTIVE_STATUSES.includes(s));
  return { active, source: 'paysight', statuses };
}

async function checkShopifyTag(email) {
  const shop      = process.env.SHOPIFY_STORE_DOMAIN;
  const token     = process.env.SHOPIFY_ADMIN_TOKEN;
  const memberTag = process.env.CONJURED_MEMBER_TAG;

  const query = `
    query getCustomer($email: String!) {
      customers(first: 1, query: $email) {
        edges { node { id email tags } }
      }
    }
  `;
  const r = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token
    },
    body: JSON.stringify({ query, variables: { email: `email:${email}` } })
  });
  const data = await r.json();
  const edges = data?.data?.customers?.edges;
  if (!edges?.length) return { active: false, source: 'shopify-tag' };

  const tags = edges[0].node.tags || [];
  const active = tags.some(t => t.toLowerCase().trim() === memberTag.toLowerCase().trim());
  return { active, source: 'shopify-tag' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).end();

  const { email } = req.body;
  if (!email) return res.status(400).json({ active: false, reason: 'No email.' });

  const cleanEmail = email.toLowerCase().trim();

  try {
    if (process.env.PAYSIGHT_API_KEY) {
      const result = await checkPaysight(cleanEmail);
      return res.status(200).json(result);
    }
    const result = await checkShopifyTag(cleanEmail);
    return res.status(200).json(result);
  } catch (e) {
    console.error('Access check error:', e);
    return res.status(200).json({ active: true, fallback: true });
  }
}
