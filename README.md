# DinoRank MCP Proxy (OAuth wrapper)

Este proyecto envuelve el servidor MCP nativo de DinoRank (`https://api.dinorank.com/mcp`,
autenticado por API key) con una capa OAuth 2.1 mínima, para poder añadirlo como
**conector personalizado** en Claude.ai — que hoy solo acepta conectores con OAuth,
no con Bearer token / API key directa.

Como eres el único usuario, la "autorización" es simplemente una pantalla con
una contraseña fija que tú defines. Tu API key de DinoRank nunca sale del servidor
del proxy: Claude nunca la ve.

## 1. Desplegar en Vercel

```bash
cd dinorank-mcp-proxy
npm install -g vercel   # si no lo tienes ya
vercel
```

Sigue el asistente (proyecto nuevo, sin framework detectado, está bien así).
Al terminar te dará una URL tipo `https://dinorank-mcp-proxy-xxxx.vercel.app`.

## 2. Configurar variables de entorno

En el dashboard de Vercel → tu proyecto → Settings → Environment Variables,
añade (o usa `vercel env add` desde la CLI):

- `PROXY_PASSWORD` → una contraseña fuerte que tú elijas.
- `JWT_SECRET` → genera uno con `openssl rand -hex 32`.
- `DINORANK_API_KEY` → tu API key real de DinoRank.
- `PROXY_BASE_URL` → la URL que te dio Vercel en el paso 1 (sin barra final).

Vuelve a desplegar después de añadir las variables:

```bash
vercel --prod
```

(Opcional pero recomendado: ponle un dominio propio en Vercel, por ejemplo
`dinorank-mcp.sianadigital.com`, y usa esa URL en `PROXY_BASE_URL` en vez de
la de `.vercel.app`.)

## 3. Comprobar que responde

```bash
curl https://tu-proyecto.vercel.app/.well-known/oauth-protected-resource
curl https://tu-proyecto.vercel.app/.well-known/oauth-authorization-server
```

Ambas deberían devolver JSON, no error.

## 4. Añadirlo en Claude.ai

1. Ve a **Settings → Connectors → Add custom connector**.
2. En "Remote MCP server URL" pon: `https://tu-proyecto.vercel.app/mcp`
3. Dale a "Add". Claude descubrirá automáticamente el resto (metadata, registro,
   endpoints de autorización) porque siguen el estándar.
4. Te llevará a la pantalla de contraseña de tu proxy. Introduce la que pusiste
   en `PROXY_PASSWORD`.
5. Listo — a partir de ahí, en cualquier conversación puedes activar el
   conector "DinoRank" desde el botón "+" → Connectors, y tendré acceso a
   `keyword_research`, `visibility`, `linkbuilding`, `tracking`, `seolocal`,
   `llms`, `tfidf`, `auditoria`, `canibalizaciones`, `searchconsole` y `analytics`.

## Notas de seguridad

- El proxy queda expuesto públicamente en internet (es un requisito de los
  conectores remotos de Claude.ai). La única barrera es tu contraseña y el
  `JWT_SECRET`. Úsalos fuertes y no los subas al repo — usa siempre variables
  de entorno de Vercel, nunca hardcodees valores en el código.
- Si en algún momento quieres revocar el acceso, basta con cambiar
  `JWT_SECRET` en Vercel: todos los tokens emitidos hasta ese momento dejan
  de ser válidos.
- El código de autorización y el access token viven solo como JWT firmados
  (sin base de datos), así que no hay estado que limpiar ni tablas que
  mantener.
