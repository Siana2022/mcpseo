const { signJWT } = require('./_lib/jwt');

const ALLOWED_REDIRECT_PREFIXES = [
  'https://claude.ai/',
  'https://claude.com/',
  'http://localhost',
  'http://127.0.0.1',
];

function isAllowedRedirect(uri) {
  if (!uri) return false;
  return ALLOWED_REDIRECT_PREFIXES.some((p) => uri.startsWith(p));
}

function renderForm({ error, hidden }) {
  const hiddenInputs = Object.entries(hidden)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeHtml(v || '')}">`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Autorizar acceso a DinoRank MCP</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .card { background: #1e293b; padding: 2.5rem; border-radius: 12px; width: 340px; box-shadow: 0 10px 30px rgba(0,0,0,.3); }
  h1 { font-size: 1.2rem; margin: 0 0 .5rem; }
  p { color: #94a3b8; font-size: .9rem; margin: 0 0 1.5rem; }
  input[type=password] { width: 100%; padding: .7rem; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #fff; margin-bottom: 1rem; box-sizing: border-box; }
  button { width: 100%; padding: .7rem; border-radius: 8px; border: none; background: #6366f1; color: #fff; font-weight: 600; cursor: pointer; }
  .error { color: #f87171; font-size: .85rem; margin-bottom: 1rem; }
</style>
</head>
<body>
  <div class="card">
    <h1>Conectar DinoRank con Claude</h1>
    <p>Introduce tu contraseña para autorizar el acceso.</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
    <form method="POST" action="/authorize">
      ${hiddenInputs}
      <input type="password" name="password" placeholder="Contraseña" autofocus required>
      <button type="submit">Autorizar</button>
    </form>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const {
      response_type, client_id, redirect_uri, state,
      code_challenge, code_challenge_method, scope,
    } = req.query;

    if (response_type !== 'code' || !isAllowedRedirect(redirect_uri) || code_challenge_method !== 'S256') {
      res.status(400).send('Solicitud de autorización inválida.');
      return;
    }

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(renderForm({
      error: null,
      hidden: { response_type, client_id, redirect_uri, state, code_challenge, code_challenge_method, scope },
    }));
    return;
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      body = Object.fromEntries(new URLSearchParams(body));
    }

    const {
      password, redirect_uri, state, code_challenge, code_challenge_method,
      response_type, client_id, scope,
    } = body;

    if (!isAllowedRedirect(redirect_uri) || code_challenge_method !== 'S256') {
      res.status(400).send('Solicitud de autorización inválida.');
      return;
    }

    if (password !== process.env.PROXY_PASSWORD) {
      res.setHeader('Content-Type', 'text/html');
      res.status(401).send(renderForm({
        error: 'Contraseña incorrecta.',
        hidden: { response_type, client_id, redirect_uri, state, code_challenge, code_challenge_method, scope },
      }));
      return;
    }

    const authCode = signJWT(
      { type: 'auth_code', redirect_uri, code_challenge },
      process.env.JWT_SECRET,
      120 // 2 minutos de vida
    );

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', authCode);
    if (state) redirectUrl.searchParams.set('state', state);

    res.writeHead(302, { Location: redirectUrl.toString() });
    res.end();
    return;
  }

  res.status(405).send('Method not allowed');
};
