//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { DX_STATE, getProfilePath } from '@dxos/client-protocol';
import { BaseError } from '@dxos/errors';

/**
 * Minimal MCP client over Streamable HTTP with OAuth 2.1, used by the `dx mcp` commands.
 *
 * The server (`@dxos/mcp-space-service`) currently identifies the user with a dev-only form that takes
 * an identity key and the space ids to bring into session context; this client fills that form
 * from the active profile so nothing has to be pasted by hand. When the server moves to a signed
 * challenge, only {@link authorize} changes.
 */

export class McpProtocolError extends BaseError.extend('McpProtocolError', 'MCP protocol error') {}

/** Persisted per profile, keyed by server origin, so subsequent commands reuse the session. */
export const McpSession = Schema.Struct({
  serverUrl: Schema.String,
  clientId: Schema.String,
  accessToken: Schema.String,
  refreshToken: Schema.optional(Schema.String),
  identityKey: Schema.String,
  spaceIds: Schema.Array(Schema.String),
});
export type McpSession = Schema.Schema.Type<typeof McpSession>;

/** Token endpoint response; only the fields this client uses are modelled. */
const TokenResponse = Schema.Struct({
  access_token: Schema.String,
  refresh_token: Schema.optional(Schema.String),
});

/** JSON-RPC envelope. MCP returns one object per request; Effect's RPC transport may batch. */
const JsonRpcMessage = Schema.Struct({
  result: Schema.optional(Schema.Unknown),
  error: Schema.optional(Schema.Unknown),
});

const REDIRECT_URI = 'http://localhost:3000/callback';

export const sessionDir = (profile: string): string => join(getProfilePath(DX_STATE, profile), 'mcp');

const sessionPath = (profile: string, serverUrl: string): string => {
  const { host } = new URL(serverUrl);
  return join(sessionDir(profile), `${host}.json`);
};

export const loadSession = (profile: string, serverUrl: string): Effect.Effect<McpSession | undefined, never, never> =>
  Effect.tryPromise(() => readFile(sessionPath(profile, serverUrl), 'utf8')).pipe(
    Effect.flatMap((raw) => Schema.decodeUnknown(Schema.parseJson(McpSession))(raw)),
    // A missing or corrupt session file is reported by the caller as "not connected".
    Effect.orElseSucceed(() => undefined),
  );

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
  spaceIds: readonly string[];
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
    throw new McpProtocolError({
      message: `Client registration failed (${registerResponse.status}): ${await registerResponse.text()}`,
    });
  }
  const { client_id: clientId } = Schema.decodeUnknownSync(Schema.Struct({ client_id: Schema.String }))(
    await registerResponse.json(),
  );

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
    throw new McpProtocolError({
      message: `Unexpected authorize page from ${base} (no nonce); is this an MCP server?`,
    });
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
    throw new McpProtocolError({
      message: `Authorization failed (${submitResponse.status}): ${await submitResponse.text()}`,
    });
  }
  const location = submitResponse.headers.get('location');
  if (!location) {
    throw new McpProtocolError({ message: 'Authorization redirect did not include a Location header.' });
  }
  const code = new URL(location).searchParams.get('code');
  if (!code) {
    throw new McpProtocolError({ message: 'Authorization did not return a code.' });
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
    spaceIds: [...spaceIds],
  };
};

const exchange = async (
  base: string,
  params: Record<string, string>,
): Promise<Schema.Schema.Type<typeof TokenResponse>> => {
  const response = await fetch(`${base}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  if (response.status !== 200) {
    throw new McpProtocolError({ message: `Token exchange failed (${response.status}): ${await response.text()}` });
  }
  return Schema.decodeUnknownSync(TokenResponse)(await response.json());
};

/**
 * Issues a JSON-RPC request against the session's `/mcp` endpoint, refreshing the access token
 * once on 401 so a stored session survives token expiry without re-authorizing.
 *
 * The result is decoded against `schema`, so callers get a typed value rather than `any`.
 */
export const request = async <A, I>(
  session: McpSession,
  method: string,
  params: unknown,
  schema: Schema.Schema<A, I>,
  options: { profile?: string } = {},
): Promise<A> => {
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
    const refreshed: McpSession = {
      ...session,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? session.refreshToken,
    };
    if (options.profile) {
      await saveSession(options.profile, refreshed);
    }
    session = refreshed;
    response = await send(session.accessToken);
  }
  if (response.status !== 200) {
    throw new McpProtocolError({ message: `MCP ${method} failed (${response.status}): ${await response.text()}` });
  }

  const raw = await response.json();
  const message = Schema.decodeUnknownSync(JsonRpcMessage)(Array.isArray(raw) ? raw[0] : raw);
  if (message.error !== undefined) {
    throw new McpProtocolError({ message: `MCP ${method} failed: ${JSON.stringify(message.error)}` });
  }
  return Schema.decodeUnknownSync(schema)(message.result);
};

/** MCP requires `initialize` before any other request on a connection. */
export const initialize = async (session: McpSession, options: { profile?: string } = {}): Promise<void> => {
  await request(
    session,
    'initialize',
    {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'dx-mcp', version: '0.1.0' },
    },
    Schema.Unknown,
    options,
  );
};

/** `tools/list` result. */
export const ToolsListResult = Schema.Struct({
  tools: Schema.Array(Schema.Struct({ name: Schema.String, description: Schema.optional(Schema.String) })),
});

/** `tools/call` result; `structuredContent` is present when the tool declares an output schema. */
export const ToolCallResult = Schema.Struct({
  isError: Schema.optional(Schema.Boolean),
  content: Schema.optional(Schema.Unknown),
  structuredContent: Schema.optional(Schema.Unknown),
});
