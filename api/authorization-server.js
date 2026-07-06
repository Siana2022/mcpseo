module.exports = (req, res) => {
  const base = process.env.PROXY_BASE_URL;
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    registration_endpoint: `${base}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  });
};
