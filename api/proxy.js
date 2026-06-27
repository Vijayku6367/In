// Vercel serverless function – CORS proxy for Instagram API
// Deploy as api/proxy.js in your repository

export default async function handler(req, res) {
  // Set CORS headers to allow your frontend to call this proxy
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-IG-Sessionid, X-IG-Csrftoken, X-IG-App-Id, User-Agent, x-requested-with');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get target Instagram URL from query parameter
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing ?url= parameter' });
  }

  // Forward cookies from the frontend via custom headers
  const sessionId = req.headers['x-ig-sessionid'] || '';
  const csrfToken = req.headers['x-ig-csrftoken'] || '';
  const appId = req.headers['x-ig-app-id'] || '1217981644879628';
  const userAgent = req.headers['user-agent'] || 'Instagram 219.0.0.12.117 Android';

  // Build Instagram API request
  const fetchOptions = {
    method: req.method,
    headers: {
      'Cookie': `sessionid=${sessionId}; csrftoken=${csrfToken}`,
      'x-ig-app-id': appId,
      'User-Agent': userAgent,
      'x-csrftoken': csrfToken,
      'Accept': 'application/json',
      'x-requested-with': 'XMLHttpRequest',
    },
  };

  if (req.body) {
    fetchOptions.body = req.body;
    fetchOptions.headers['Content-Type'] = req.headers['content-type'] || 'application/x-www-form-urlencoded';
  }

  try {
    const igResponse = await fetch(url, fetchOptions);
    // Capture Set-Cookie headers from Instagram response and forward them
    const setCookie = igResponse.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('X-IG-Cookies', setCookie);
    }

    // Forward status and body
    res.status(igResponse.status);
    const body = await igResponse.text();
    res.send(body);
  } catch (err) {
    res.status(500).json({ error: 'Proxy fetch failed', details: err.message });
  }
}
