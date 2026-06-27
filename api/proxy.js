// CORS proxy for Instagram API — correctly handles cookies and body
export const config = { api: { bodyParser: false } };  // we consume raw body ourselves

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-IG-Sessionid, X-IG-Csrftoken, X-IG-App-Id, User-Agent, x-requested-with');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing ?url=' });

  // Read custom headers that the browser sends
  const sessionId  = req.headers['x-ig-sessionid'] || '';
  const csrfToken  = req.headers['x-ig-csrftoken'] || '';
  const appId      = req.headers['x-ig-app-id'] || '1217981644879628';
  const userAgent  = req.headers['user-agent'] || 'Instagram 219.0.0.12.117 Android';
  const reqMethod  = req.method;

  // Build headers for the Instagram request
  const forwardHeaders = {
    'Cookie': `sessionid=${sessionId}; csrftoken=${csrfToken}`,
    'x-ig-app-id': appId,
    'User-Agent': userAgent,
    'x-csrftoken': csrfToken,
    'Accept': 'application/json',
    'x-requested-with': 'XMLHttpRequest',
  };

  // Consume raw body (disabled bodyParser, so req is a readable stream)
  let bodyStr = '';
  for await (const chunk of req) {
    bodyStr += chunk;
  }

  // If we have a body, forward it with the appropriate content-type
  if (bodyStr) {
    forwardHeaders['Content-Type'] = req.headers['content-type'] || 'application/x-www-form-urlencoded';
    forwardHeaders['Content-Length'] = Buffer.byteLength(bodyStr).toString();
  }

  try {
    const fetchOptions = {
      method: reqMethod,
      headers: forwardHeaders,
    };
    if (bodyStr) fetchOptions.body = bodyStr;

    const igResp = await fetch(url, fetchOptions);

    // Capture Set-Cookie from Instagram and forward to browser via X-IG-Cookies
    const setCookie = igResp.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('X-IG-Cookies', setCookie);
    }

    const respBody = await igResp.text();
    res.status(igResp.status).send(respBody);
  } catch (err) {
    res.status(500).json({ error: 'Proxy fetch failed', details: err.message });
  }
}
