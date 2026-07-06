const { verifyJWT } = require('./_lib/jwt');

const DINORANK_MCP_URL = 'https://api.dinorank.com/mcp';

function sendAuthChallenge(res) {
  const base = process.env.PROXY_BASE_URL;
  res.setHeader(
    'WWW-Authenticate',
    `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`
  );
  res.status(401).json({ error: 'unauthorized' });
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    sendAuthChallenge(res);
    return;
  }

  try {
    const payload = verifyJWT(token, process.env.JWT_SECRET);
    if (payload.type !== 'access_token') throw new Error('tipo de token incorrecto');
  } catch (e) {
    sendAuthChallenge(res);
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      // dejamos el string tal cual si no es JSON
    }
  }

  try {
    const upstream = await fetch(DINORANK_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.DINORANK_API_KEY,
        ...(req.headers['mcp-protocol-version']
          ? { 'MCP-Protocol-Version': req.headers['mcp-protocol-version'] }
          : {}),
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'bad_gateway', error_description: 'No se pudo contactar con DinoRank' });
  }
};
