export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-IG-Sessionid, X-IG-Csrftoken, X-IG-App-Id, User-Agent, X-Requested-With');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).send('Missing ?url= parameter');

  // Read custom headers sent by the frontend
  const sessionId  = req.headers['x-ig-sessionid'] || '';
  const csrfToken  = req.headers['x-ig-csrftoken'] || '';
  const appId      = req.headers['x-ig-app-id'] || '9366197433924594';
  const userAgent  = req.headers['user-agent'] || 'Instagram 219.0.0.12.117 Android';

  // Build headers for Instagram request
  const forwardHeaders = {
    'Cookie': `sessionid=${sessionId}; csrftoken=${csrfToken}`,
    'x-ig-app-id': appId,
    'User-Agent': userAgent,
    'x-csrftoken': csrfToken,
    'Accept': '*/*',
    'x-requested-with': 'XMLHttpRequest'
  };

  // Read the raw body from the frontend
  let bodyStr = '';
  for await (const chunk of req) { bodyStr += chunk; }

  if (bodyStr) {
    forwardHeaders['Content-Type'] = req.headers['content-type'] || 'application/x-www-form-urlencoded';
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: forwardHeaders,
      redirect: 'follow',
    };
    if (bodyStr) fetchOptions.body = bodyStr;

    const igResp = await fetch(url, fetchOptions);

    // Collect Set-Cookie headers (multiple may be present)
    const rawSetCookie = igResp.headers.raw ? igResp.headers.raw['set-cookie'] : [];
    if (rawSetCookie.length) {
      res.setHeader('X-IG-Cookies', rawSetCookie.join(', '));
    } else if (igResp.headers.get('set-cookie')) {
      res.setHeader('X-IG-Cookies', igResp.headers.get('set-cookie'));
    }

    const respBody = await igResp.text();
    res.status(igResp.status).send(respBody);
  } catch (err) {
    res.status(502).send(`Proxy error: ${err.message}`);
  }
}
