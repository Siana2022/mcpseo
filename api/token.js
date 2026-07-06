const { signJWT, verifyJWT, sha256base64url } = require('./_lib/jwt');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    // Puede llegar como JSON o como x-www-form-urlencoded
    try {
      body = JSON.parse(body);
    } catch {
      body = Object.fromEntries(new URLSearchParams(body));
    }
  }

  const { grant_type, code, redirect_uri, code_verifier } = body;

  if (grant_type !== 'authorization_code') {
    res.status(400).json({ error: 'unsupported_grant_type' });
    return;
  }

  let authPayload;
  try {
    authPayload = verifyJWT(code, process.env.JWT_SECRET);
  } catch (e) {
    res.status(400).json({ error: 'invalid_grant', error_description: 'Código inválido o expirado' });
    return;
  }

  if (authPayload.type !== 'auth_code') {
    res.status(400).json({ error: 'invalid_grant' });
    return;
  }

  if (authPayload.redirect_uri !== redirect_uri) {
    res.status(400).json({ error: 'invalid_grant', error_description: 'redirect_uri no coincide' });
    return;
  }

  const computedChallenge = sha256base64url(code_verifier || '');
  if (computedChallenge !== authPayload.code_challenge) {
    res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE inválido' });
    return;
  }

  const accessToken = signJWT(
    { type: 'access_token', sub: 'juanjo' },
    process.env.JWT_SECRET,
    60 * 60 * 12 // 12 horas
  );

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 60 * 60 * 12,
  });
};
