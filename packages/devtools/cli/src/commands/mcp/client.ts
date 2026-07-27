//
// Copyright 2026 DXOS.org
//

import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { DX_STATE, getProfilePath } from '@dxos/client-protocol';

/**
 * Minimal MCP client over Streamable HTTP with OAuth 2.1, used by the `dx mcp` commands.
 *
 * The server (`@dxos/space-agent`) currently identifies the user with a dev-only form that takes
 * an identity key and the space ids to bring into session context; this client fills that form
 * from the active profile so nothing has to be pasted by hand. When the server moves to a signed
 * challenge, only {@link authorize} changes.
 */

/** Persisted per profile, keyed by server origin, so subsequent commands reuse the session. */
export type McpSession = {
  serverUrl: string;
  clientId: string;
  accessToken: string;
  refreshToken?: string;
  identityKey: string;
  spaceIds: string[];
};

const REDIRECT_URI = 'http://localhost:3000/callback';

const sessionPath = (profile: string, serverUrl: string): string => {
  const { host } = new URL(serverUrl);
  return join(getProfilePath(DX_STATE, profile), 'mcp', `${host}.json`);
};

export const loadSession = async (profile: string, serverUrl: string): Promise<McpSession | undefined> => {
  try {
    return JSON.parse(await readFile(sessionPath(profile, serverUrl), 'utf8'));
  } catch {
    return undefined;
  }
};

export const saveSession = async (profile: string, session: McpSession): Promise<void> => {
  const path = sessionPath(profile, session.serverUrl);
  await mkdir(dirname(path), { recursive: true });
  // Tokens are bearer credentials: keep them readable only by the current user.
  await writeFile(path, JSON.stringify(session, null, 2), { mode: 0o600 });
};

/**
 * Runs the full OAuth 2.1 flow: RFC 7591 dynamic client registration, PKCE authorize (submitting
 * the server's identity form), and the authorization-code exchange.
 */
export const authorize = async ({
  serverUrl,
  identityKey,
  spaceIds,
  haloSpaceId,
}: {
  serverUrl: string;
  identityKey: string;
  spaceIds: string[];
  haloSpaceId?: string;
}): Promise<McpSession> => {
  const base = serverUrl.replace(/\/(mcp)?$/, '');

  const registerResponse = await fetch(`${base}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'dx mcp',
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: 'none',
    }),
  });
  if (registerResponse.status !== 201) {
    throw new Error(`Client registration failed (${registerResponse.status}): ${await registerResponse.text()}`);
  }
  const { client_id: clientId } = (await registerResponse.json()) as { client_id: string };

  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  const authorizeUrl = new URL(`${base}/authorize`);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  const formResponse = await fetch(authorizeUrl);
  const formHtml = await formResponse.text();
  const nonce = formHtml.match(/name="nonce"\s+value="([^"]+)"/)?.[1];
  if (!nonce) {
    throw new Error(`Unexpected authorize page from ${base} (no nonce); is this an MCP server?`);
  }

  const submitResponse = await fetch(`${base}/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      nonce,
      identity_key: identityKey,
      space_ids: spaceIds.join(','),
      // Falls back to the first space when the identity has no registered agent to look up.
      halo_space_id: haloSpaceId ?? spaceIds[0] ?? '',
    }).toString(),
    redirect: 'manual',
  });
  if (submitResponse.status !== 302) {
    throw new Error(`Authorization failed (${submitResponse.status}): ${await submitResponse.text()}`);
  }
  const code = new URL(submitResponse.headers.get('location')!).searchParams.get('code');
  if (!code) {
    throw new Error('Authorization did not return a code.');
  }

  const tokens = await exchange(base, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  return {
    serverUrl: base,
    clientId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    identityKey,
    spaceIds,
  };
};

const exchange = async (
  base: string,
  params: Record<string, string>,
): Promise<{ access_token: string; refresh_token?: string }> => {
  const response = await fetch(`${base}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  if (response.status !== 200) {
    throw new Error(`Token exchange failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as { access_token: string; refresh_token?: string };
};

/**
 * Issues a JSON-RPC request against the session's `/mcp` endpoint, refreshing the access token
 * once on 401 so a stored session survives token expiry without re-authorizing.
 */
export const request = async (
  session: McpSession,
  method: string,
  params: unknown,
  options: { profile?: string } = {},
): Promise<any> => {
  const send = (token: string) =>
    fetch(`${session.serverUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    });

  let response = await send(session.accessToken);
  if (response.status === 401 && session.refreshToken) {
    const tokens = await exchange(session.serverUrl, {
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
      client_id: session.clientId,
    });
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token ?? session.refreshToken;
    if (options.profile) {
      await saveSession(options.profile, session);
    }
    response = await send(session.accessToken);
  }
  if (response.status !== 200) {
    throw new Error(`MCP ${method} failed (${response.status}): ${await response.text()}`);
  }

  const raw = await response.json();
  // The Effect RPC transport batches; MCP Streamable HTTP returns a single object per request.
  const message = (Array.isArray(raw) ? raw[0] : raw) as { result?: any; error?: unknown };
  if (message.error) {
    throw new Error(`MCP ${method} failed: ${JSON.stringify(message.error)}`);
  }
  return message.result;
};

/** MCP requires `initialize` before any other request on a connection. */
export const initialize = async (session: McpSession, options: { profile?: string } = {}): Promise<any> =>
  request(
    session,
    'initialize',
    {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'dx-mcp', version: '0.1.0' },
    },
    options,
  );
