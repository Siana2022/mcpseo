const { verifyJWT } = require('./_lib/jwt');
const { TOOL_TO_ENDPOINT } = require('./_lib/tool-endpoints');

const DINORANK_MCP_URL = 'https://api.dinorank.com/mcp';
const DINORANK_REST_BASE = 'https://api.dinorank.com';

function sendAuthChallenge(res) {
  const base = process.env.PROXY_BASE_URL;
  res.setHeader(
    'WWW-Authenticate',
    `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`
  );
  res.status(401).json({ error: 'unauthorized' });
}

function jsonRpcError(res, id, message) {
  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code: -32000, message },
  }));
}

function jsonRpcToolResult(res, id, data) {
  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({
    jsonrpc: '2.0',
    id,
    result: {
      content: [{ type: 'text', text: JSON.stringify(data) }],
    },
  }));
}

async function callDinorankRest(toolName, args) {
  const path = TOOL_TO_ENDPOINT[toolName];
  const response = await fetch(`${DINORANK_REST_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.DINORANK_API_KEY,
    },
    body: JSON.stringify(args || {}),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json) {
    throw new Error(`DinoRank REST respondió ${response.status} para "${toolName}"`);
  }
  return json.data !== undefined ? json.data : json;
}

async function proxyToDinorankMcp(req, res, body) {
  const upstream = await fetch(DINORANK_MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': req.headers['accept'] || 'application/json, text/event-stream',
      'X-API-Key': process.env.DINORANK_API_KEY,
      ...(req.headers['mcp-protocol-version']
        ? { 'MCP-Protocol-Version': req.headers['mcp-protocol-version'] }
        : {}),
      ...(req.headers['mcp-session-id']
        ? { 'Mcp-Session-Id': req.headers['mcp-session-id'] }
        : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  res.status(upstream.status);
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');

  const sessionId = upstream.headers.get('mcp-session-id');
  if (sessionId) res.setHeader('Mcp-Session-Id', sessionId);

  res.send(text);
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

  const isToolCall =
    body && typeof body === 'object' && body.method === 'tools/call' &&
    body.params && TOOL_TO_ENDPOINT[body.params.name];

  if (isToolCall) {
    try {
      const data = await callDinorankRest(body.params.name, body.params.arguments);
      jsonRpcToolResult(res, body.id, data);
    } catch (e) {
      jsonRpcError(res, body.id, e.message || 'Error consultando DinoRank REST');
    }
    return;
  }

  try {
    await proxyToDinorankMcp(req, res, body);
  } catch (e) {
    res.status(502).json({ error: 'bad_gateway', error_description: 'No se pudo contactar con DinoRank' });
  }
};