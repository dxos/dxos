//
// Copyright 2026 DXOS.org
//

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createHash, randomUUID } from 'node:crypto';
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';

/**
 * A local MCP server with one endpoint per auth mode, for tests and demos of the client:
 * - `/open/mcp` needs nothing;
 * - `/key/mcp` needs `Authorization: Bearer <apiKey>`;
 * - `/oauth/mcp` needs a token from its own OAuth 2.1 authorization server (RFC 9728 resource
 *   metadata, RFC 8414 server metadata, RFC 7591 dynamic registration, PKCE S256, refresh tokens).
 *
 * `/authorize` renders a consent page; its Approve link (or {@link TestServer.approve}) redirects
 * back with a code. Every response carries permissive CORS headers so a browser page can call it.
 */
export type TestServer = {
  origin: string;
  apiKey: string;
  urls: { open: string; key: string; oauth: string };
  /** Follows an authorization URL the way a user clicking Approve would; resolves the redirect. */
  approve: (authorizationUrl: string) => Promise<URL>;
  /** Invalidates every access token issued so far (refresh tokens stay valid). */
  expireAccessTokens: () => void;
  /** Forgets every registered client, so their token requests fail with `invalid_client`. */
  forgetClients: () => void;
  stats: { registrations: number; codeExchanges: number; refreshes: number };
  close: () => Promise<void>;
};

export type TestServerOptions = {
  port?: number;
  apiKey?: string;
  /** Access-token lifetime reported to clients, in seconds. */
  expiresIn?: number;
  /** Skip the consent page, as a provider does for a user who already consented. */
  autoApprove?: boolean;
};

const TOOLS = [
  {
    name: 'get_weather',
    description: 'Returns the current weather for a city.',
    inputSchema: {
      type: 'object' as const,
      properties: { city: { type: 'string', description: 'City name.' } },
      required: ['city'],
    },
  },
];

type PendingCode = { clientId: string; redirectUri: string; challenge: string; resource?: string };

export const startTestServer = async ({
  port = 0,
  apiKey = 'test-api-key',
  expiresIn = 3600,
  autoApprove = false,
}: TestServerOptions = {}): Promise<TestServer> => {
  const clients = new Map<string, { redirectUris: string[] }>();
  const codes = new Map<string, PendingCode>();
  const accessTokens = new Set<string>();
  const refreshTokens = new Map<string, string>();
  const stats = { registrations: 0, codeExchanges: 0, refreshes: 0 };
  let origin = '';

  const issueTokens = (clientId: string) => {
    const accessToken = `at-${randomUUID()}`;
    const refreshToken = `rt-${randomUUID()}`;
    accessTokens.add(accessToken);
    refreshTokens.set(refreshToken, clientId);
    return { access_token: accessToken, token_type: 'Bearer', expires_in: expiresIn, refresh_token: refreshToken };
  };

  const handle = async (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    response.setHeader('Access-Control-Expose-Headers', 'mcp-session-id, www-authenticate');
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }

    const url = new URL(request.url ?? '/', origin);
    const body = await readBody(request);

    switch (url.pathname) {
      case '/.well-known/oauth-protected-resource':
      case '/.well-known/oauth-protected-resource/oauth/mcp':
        return json(response, 200, {
          resource: `${origin}/oauth/mcp`,
          authorization_servers: [origin],
          bearer_methods_supported: ['header'],
        });

      case '/.well-known/oauth-authorization-server':
        return json(response, 200, {
          issuer: origin,
          authorization_endpoint: `${origin}/authorize`,
          token_endpoint: `${origin}/token`,
          registration_endpoint: `${origin}/register`,
          response_types_supported: ['code'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
          code_challenge_methods_supported: ['S256'],
          token_endpoint_auth_methods_supported: ['none'],
        });

      case '/register': {
        const metadata = JSON.parse(body.toString() || '{}');
        const clientId = `client-${randomUUID()}`;
        clients.set(clientId, { redirectUris: metadata.redirect_uris ?? [] });
        stats.registrations++;
        return json(response, 201, {
          ...metadata,
          client_id: clientId,
          client_id_issued_at: Math.floor(Date.now() / 1000),
        });
      }

      case '/authorize': {
        const clientId = url.searchParams.get('client_id') ?? '';
        const redirectUri = url.searchParams.get('redirect_uri') ?? '';
        const client = clients.get(clientId);
        if (!client || !client.redirectUris.includes(redirectUri)) {
          return json(response, 400, { error: 'invalid_request', error_description: 'Unknown client or redirect.' });
        }
        if (!autoApprove && url.searchParams.get('approve') !== '1') {
          url.searchParams.set('approve', '1');
          response.writeHead(200, { 'content-type': 'text/html' });
          response.end(consentPage(url.pathname + url.search));
          return;
        }
        const code = `code-${randomUUID()}`;
        codes.set(code, {
          clientId,
          redirectUri,
          challenge: url.searchParams.get('code_challenge') ?? '',
          resource: url.searchParams.get('resource') ?? undefined,
        });
        const redirect = new URL(redirectUri);
        redirect.searchParams.set('code', code);
        const state = url.searchParams.get('state');
        if (state) {
          redirect.searchParams.set('state', state);
        }
        response.writeHead(302, { location: redirect.href }).end();
        return;
      }

      case '/token': {
        const params = new URLSearchParams(body.toString());
        if (!clients.has(params.get('client_id') ?? '')) {
          return json(response, 401, { error: 'invalid_client' });
        }
        const grantType = params.get('grant_type');
        if (grantType === 'authorization_code') {
          const pending = codes.get(params.get('code') ?? '');
          codes.delete(params.get('code') ?? '');
          const verifier = params.get('code_verifier') ?? '';
          const challenge = createHash('sha256').update(verifier).digest('base64url');
          if (!pending || pending.challenge !== challenge || pending.clientId !== params.get('client_id')) {
            return json(response, 400, { error: 'invalid_grant' });
          }
          stats.codeExchanges++;
          return json(response, 200, issueTokens(pending.clientId));
        }
        if (grantType === 'refresh_token') {
          const refreshToken = params.get('refresh_token') ?? '';
          const clientId = refreshTokens.get(refreshToken);
          if (!clientId || clientId !== params.get('client_id')) {
            return json(response, 400, { error: 'invalid_grant' });
          }
          refreshTokens.delete(refreshToken);
          stats.refreshes++;
          return json(response, 200, issueTokens(clientId));
        }
        return json(response, 400, { error: 'unsupported_grant_type' });
      }

      case '/open/mcp':
        return serveMcp(request, response, body, 'open');

      case '/key/mcp':
        if (request.headers.authorization !== `Bearer ${apiKey}`) {
          return json(response, 401, { error: 'invalid_token' });
        }
        return serveMcp(request, response, body, 'key');

      case '/oauth/mcp': {
        const token = request.headers.authorization?.replace(/^Bearer /, '');
        if (!token || !accessTokens.has(token)) {
          response.setHeader(
            'WWW-Authenticate',
            `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/oauth/mcp"`,
          );
          return json(response, 401, { error: 'invalid_token' });
        }
        return serveMcp(request, response, body, 'oauth');
      }

      default:
        return json(response, 404, { error: 'not_found' });
    }
  };

  const httpServer = createServer((request, response) => {
    handle(request, response).catch((error) => {
      if (!response.headersSent) {
        json(response, 500, { error: String(error) });
      }
    });
  });

  await new Promise<void>((resolve) => httpServer.listen(port, resolve));
  const address = httpServer.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Test server is not listening on a TCP port.');
  }
  origin = `http://localhost:${address.port}`;

  return {
    origin,
    apiKey,
    urls: { open: `${origin}/open/mcp`, key: `${origin}/key/mcp`, oauth: `${origin}/oauth/mcp` },
    stats,
    approve: async (authorizationUrl) => {
      const approveUrl = new URL(authorizationUrl);
      approveUrl.searchParams.set('approve', '1');
      const response = await fetch(approveUrl, { redirect: 'manual' });
      const location = response.headers.get('location');
      if (response.status !== 302 || !location) {
        throw new Error(`Authorization was not approved: ${response.status} ${await response.text()}`);
      }
      return new URL(location);
    },
    expireAccessTokens: () => accessTokens.clear(),
    forgetClients: () => clients.clear(),
    close: () =>
      new Promise<void>((resolve) => {
        httpServer.closeAllConnections();
        httpServer.close(() => resolve());
      }),
  };
};

/** One stateless MCP transport per request, serving {@link TOOLS}. */
const serveMcp = async (request: IncomingMessage, response: ServerResponse, body: Buffer, mode: string) => {
  const server = new Server({ name: `test-${mode}`, version: '0.0.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    const city = String((params.arguments ?? {}).city ?? 'somewhere');
    return {
      content: [{ type: 'text', text: `Weather in ${city}: 21°C and sunny (served by the ${mode} endpoint).` }],
    };
  });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  response.on('close', () => {
    void transport.close();
    void server.close();
  });
  await transport.handleRequest(request, response, body.length > 0 ? JSON.parse(body.toString()) : undefined);
};

const readBody = async (request: IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const json = (response: ServerResponse, status: number, value: unknown) => {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
};

const consentPage = (approveHref: string) => `<!doctype html>
<html><head><title>Test MCP — Authorize</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0}
main{border:1px solid #ccc;border-radius:12px;padding:32px;text-align:center}
a{display:inline-block;margin-top:16px;padding:10px 24px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none}</style>
</head><body><main><h2>Test MCP server</h2><p>DXOS Composer wants to use your weather tools.</p>
<a id="approve" href="${approveHref}">Approve</a></main></body></html>`;
