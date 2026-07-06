module.exports = (req, res) => {
  const base = process.env.PROXY_BASE_URL;
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    resource: `${base}/mcp`,
    authorization_servers: [base],
  });
};
