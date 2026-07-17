export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set.' });
  }

  const { prompt, system, messages } = req.body;

  // Accept either a single prompt OR a full messages array (for Pastor chat)
  let messageList;
  if (Array.isArray(messages) && messages.length) {
    messageList = messages.slice(-24); // keep context reasonable
  } else if (prompt) {
    messageList = [{ role: 'user', content: prompt }];
  } else {
    return res.status(400).json({ error: 'prompt or messages required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1024,
        ...(system ? { system } : {}),
        messages: messageList
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('Anthropic proxy error:', err);
    return res.status(500).json({ error: 'Failed to contact Anthropic API.' });
  }
}
