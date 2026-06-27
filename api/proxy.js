export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-IG-Sessionid, X-IG-Csrftoken, X-IG-App-Id, User-Agent, X-Requested-With');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing ?url=' });

  // Collect custom headers
  const sessionId  = req.headers['x-ig-sessionid'] || '';
  const csrfToken  = req.headers['x-ig-csrftoken'] || '';
  const appId      = req.headers['x-ig-app-id'] || '1217981644879628';
  const userAgent  = req.headers['user-agent'] || 'Instagram 219.0.0.12.117 Android';

  // Build Instagram headers
  const igHeaders = {
    'Cookie': `sessionid=${sessionId}; csrftoken=${csrfToken}`,
    'x-ig-app-id': appId,
    'User-Agent': userAgent,
    'x-csrftoken': csrfToken,
    'Accept': '*/*',
    'x-requested-with': 'XMLHttpRequest'
  };

  // Read raw request body (disabled bodyParser)
  const chunks = [];
  for await (const chunk of req) { chunks.push(chunk); }
  const rawBody = Buffer.concat(chunks).toString('utf8');

  if (rawBody) {
    igHeaders['Content-Type'] = req.headers['content-type'] || 'application/x-www-form-urlencoded';
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: igHeaders,
      redirect: 'follow'
    };
    if (rawBody) fetchOptions.body = rawBody;

    const igResp = await fetch(url, fetchOptions);

    // Forward Set-Cookie header(s) as X-IG-Cookies
    const setCookie = igResp.headers.get('set-cookie');
    if (setCookie) {
      // Join multiple Set-Cookie values if present (e.g., comma separated)
      const allCookies = igResp.headers.raw ? igResp.headers.raw['set-cookie']?.join(',') : setCookie;
      res.setHeader('X-IG-Cookies', allCookies);
    }

    const respBody = await igResp.text();
    res.status(igResp.status).send(respBody);
  } catch (err) {
    res.status(502).send(`Proxy error: ${err.message}`);
  }
}
