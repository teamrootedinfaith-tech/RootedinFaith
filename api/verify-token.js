import crypto from 'crypto';
 
function verifyToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format.');
 
  const [header, body, sig] = parts;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
 
  // Timing-safe comparison
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) throw new Error('Invalid signature.');
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) throw new Error('Invalid signature.');
 
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
 
  // Check expiry
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired. Please use the login button again.');
  }
 
  return payload;
}
 
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).end();
 
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'No token provided.' });
 
  const jwtSecret      = process.env.JWT_SECRET;
  const supabaseUrl    = process.env.SUPABASE_URL;
  const supabaseService = process.env.SUPABASE_SERVICE_KEY;
 
  // 1. Verify the signed token
  let payload;
  try {
    payload = verifyToken(token, jwtSecret);
  } catch(e) {
    return res.status(401).json({ error: e.message });
  }
 
  const { email } = payload;
 
  // 2. Check if Supabase user exists — if not, create one
  //    We use the service key here (admin privileges, server-side only)
  const listRes = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        'apikey':        supabaseService,
        'Authorization': `Bearer ${supabaseService}`
      }
    }
  );
  const listData = await listRes.json();
  let userId;
 
  if (listData.users && listData.users.length > 0) {
    userId = listData.users[0].id;
  } else {
    // Create the user automatically — no password needed for SSO users
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        supabaseService,
        'Authorization': `Bearer ${supabaseService}`
      },
      body: JSON.stringify({
        email,
        email_confirm: true,  // Auto-confirm since Shopify already verified them
        user_metadata: { sso: 'shopify' }
      })
    });
    const created = await createRes.json();
    userId = created.id;
  }
 
  // 3. Generate a magic link so the app can sign them in
  const magicRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/generate-link`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        supabaseService,
      'Authorization': `Bearer ${supabaseService}`
    },
    body: JSON.stringify({ type: 'magiclink', email })
  });
 
  const magicData = await magicRes.json();
 
  if (!magicData.action_link) {
    return res.status(500).json({ error: 'Failed to generate login link.' });
  }
 
  return res.status(200).json({
    email,
    actionLink: magicData.action_link
  });
}
