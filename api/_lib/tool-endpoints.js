// Mapeo herramienta MCP -> endpoint REST de DinoRank.
// Todas aceptan POST con JSON body según su documentación pública
// (https://api.dinorank.com/docs/docs.html), incluidas las que también
// soportan GET.
const TOOL_TO_ENDPOINT = {
  keyword_research: '/api/v1/keyword-research',
  visibility: '/api/v1/visibility',
  linkbuilding: '/api/v1/linkbuilding',
  tracking: '/api/v1/tracking',
  seolocal: '/api/v1/seolocal',
  llms: '/api/v1/llms',
  tfidf: '/api/v1/tfidf',
  auditoria: '/api/v1/auditoria',
  canibalizaciones: '/api/v1/canibalizaciones',
  searchconsole: '/api/v1/searchconsole',
  analytics: '/api/v1/analytics',
};

module.exports = { TOOL_TO_ENDPOINT };