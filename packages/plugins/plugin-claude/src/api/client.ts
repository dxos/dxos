//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import { proxyFetchLegacy } from '@dxos/edge-client';

import {
  ANTHROPIC_API_URL,
  ANTHROPIC_VERSION,
  CREDENTIAL_PAGE_LIMIT,
  MANAGED_AGENTS_BETA,
  REQUEST_RETRIES,
  REQUEST_RETRY_DELAY,
  REQUEST_TIMEOUT_MS,
} from '../constants';
import { ClaudeAgentApiError } from '../errors';
import {
  type AgentConfig,
  AgentResponse,
  CredentialPage,
  CredentialResponse,
  EnvironmentResponse,
  type EnvironmentVariableCredential,
  type EventOrder,
  EventPage,
  Ignored,
  SessionResponse,
  VaultResponse,
} from './types';

/**
 * A retry is safe on a GET, which changes nothing; on a POST it is safe only where the server says
 * it did not act, since a lost response would otherwise create the session or credential twice.
 * A 403 from the edge proxy is transient often enough to be worth retrying, and rejects the request
 * before it reaches the control plane, so it did not act either.
 */
export const isRetryable = (method: 'GET' | 'POST', error: ClaudeAgentApiError): boolean =>
  error.status === 403 || error.status === 429 || (method === 'GET' && (error.status === 0 || error.status >= 500));

type Request<A> = {
  apiKey: string;
  method: 'GET' | 'POST';
  path: string;
  schema: Schema.Codec<A>;
  body?: unknown;
};

/** Calls the Managed Agents control plane through the edge CORS proxy, which api.anthropic.com requires. */
export const request = <A>({ apiKey, method, path, schema, body }: Request<A>): Effect.Effect<A, ClaudeAgentApiError> =>
  Effect.tryPromise({
    try: async (): Promise<unknown> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      // Cleared only after the body is consumed, so a stalled body stream stays bounded.
      try {
        const response = await proxyFetchLegacy(new URL(`${ANTHROPIC_API_URL}${path}`), {
          method,
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
            'anthropic-beta': MANAGED_AGENTS_BETA,
            'content-type': 'application/json',
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new ClaudeAgentApiError(response.status, await response.text().catch(() => ''));
        }

        return await response.json();
      } finally {
        clearTimeout(timeout);
      }
    },
    // A transport failure (offline, abort, proxy error) has no HTTP status of its own.
    catch: (error) => (error instanceof ClaudeAgentApiError ? error : new ClaudeAgentApiError(0, String(error))),
  }).pipe(
    // Fixed rather than exponential: this runs under an interactive operation, which needs a
    // bounded delay.
    Effect.retry({
      schedule: Schedule.fixed(REQUEST_RETRY_DELAY).pipe(Schedule.upTo({ times: REQUEST_RETRIES })),
      while: (error) => isRetryable(method, error),
    }),
    Effect.flatMap((json) =>
      Schema.decodeUnknownEffect(schema)(json).pipe(
        Effect.mapError((error) => new ClaudeAgentApiError(0, `Unexpected response shape: ${error}`)),
      ),
    ),
  );

/** Creates a saved agent configuration. */
export const createAgent = (apiKey: string, config: AgentConfig): Effect.Effect<AgentResponse, ClaudeAgentApiError> =>
  request({ apiKey, method: 'POST', path: '/v1/agents', schema: AgentResponse, body: config });

/**
 * Updates an existing agent, bumping its version. `version` is sent for optimistic concurrency: a
 * mismatch is rejected with 409 rather than silently overwriting a config changed elsewhere.
 */
export const updateAgent = (
  apiKey: string,
  agentId: string,
  config: AgentConfig,
  version?: number,
): Effect.Effect<AgentResponse, ClaudeAgentApiError> =>
  request({
    apiKey,
    method: 'POST',
    path: `/v1/agents/${agentId}`,
    schema: AgentResponse,
    body: version === undefined ? config : { ...config, version },
  });

/** Creates the cloud environment sessions run in, with unrestricted egress for the agent's tools. */
export const createEnvironment = (
  apiKey: string,
  name: string,
): Effect.Effect<EnvironmentResponse, ClaudeAgentApiError> =>
  request({
    apiKey,
    method: 'POST',
    path: '/v1/environments',
    schema: EnvironmentResponse,
    body: { name, config: { type: 'cloud', networking: { type: 'unrestricted' } } },
  });

/** Starts a session against a deployed agent, optionally seeding it with the first user message. */
export const createSession = (
  apiKey: string,
  params: { agentId: string; environmentId: string; title?: string; message?: string; vaultIds?: string[] },
): Effect.Effect<SessionResponse, ClaudeAgentApiError> =>
  request({
    apiKey,
    method: 'POST',
    path: '/v1/sessions',
    schema: SessionResponse,
    body: {
      agent: params.agentId,
      environment_id: params.environmentId,
      ...(params.vaultIds?.length ? { vault_ids: params.vaultIds } : {}),
      ...(params.title ? { title: params.title } : {}),
      ...(params.message
        ? { initial_events: [{ type: 'user.message', content: [{ type: 'text', text: params.message }] }] }
        : {}),
    },
  });

/** Reads a session's current state, including its status and stop reason. */
export const getSession = (apiKey: string, sessionId: string): Effect.Effect<SessionResponse, ClaudeAgentApiError> =>
  request({ apiKey, method: 'GET', path: `/v1/sessions/${sessionId}`, schema: SessionResponse });

/** Sends a user message into a running session. */
export const sendUserMessage = (
  apiKey: string,
  sessionId: string,
  message: string,
): Effect.Effect<unknown, ClaudeAgentApiError> =>
  request({
    apiKey,
    method: 'POST',
    path: `/v1/sessions/${sessionId}/events`,
    schema: Ignored,
    body: { events: [{ type: 'user.message', content: [{ type: 'text', text: message }] }] },
  });

/** Returns events chronologically, defaulting to the last `limit`: the API's own default opens at the first, which on a long session is not what a caller wants. */
export const listEvents = (
  apiKey: string,
  sessionId: string,
  limit: number,
  order: EventOrder = 'last',
): Effect.Effect<EventPage, ClaudeAgentApiError> =>
  request({
    apiKey,
    method: 'GET',
    path: `/v1/sessions/${sessionId}/events?limit=${limit}&order=${order === 'last' ? 'desc' : 'asc'}`,
    schema: EventPage,
  }).pipe(Effect.map((page) => (order === 'last' && page.data ? { ...page, data: [...page.data].reverse() } : page)));

/** One vault per session, so archiving it retires every secret that session was given. */
export const createVault = (apiKey: string, displayName: string): Effect.Effect<VaultResponse, ClaudeAgentApiError> =>
  request({ apiKey, method: 'POST', path: '/v1/vaults', schema: VaultResponse, body: { display_name: displayName } });

/** Followed to the last page: a name absent from a partial listing would be created twice. */
export const listVaultCredentials = (
  apiKey: string,
  vaultId: string,
): Effect.Effect<readonly CredentialResponse[], ClaudeAgentApiError> =>
  Effect.gen(function* () {
    const credentials: CredentialResponse[] = [];
    let page: string | undefined;
    do {
      const response: CredentialPage = yield* request({
        apiKey,
        method: 'GET',
        path: `/v1/vaults/${vaultId}/credentials?limit=${CREDENTIAL_PAGE_LIMIT}${page ? `&page=${encodeURIComponent(page)}` : ''}`,
        schema: CredentialPage,
      });
      credentials.push(...(response.data ?? []));
      page = response.next_page ?? undefined;
    } while (page);

    return credentials;
  });

/** Stores an environment-variable credential, keyed by its env var name within the vault. */
export const createVaultCredential = (
  apiKey: string,
  vaultId: string,
  credential: EnvironmentVariableCredential,
): Effect.Effect<CredentialResponse, ClaudeAgentApiError> =>
  request({
    apiKey,
    method: 'POST',
    path: `/v1/vaults/${vaultId}/credentials`,
    schema: CredentialResponse,
    body: credential,
  });

/** `secret_name` is immutable, so rotating in place is the only way to change a live value. */
export const updateVaultCredential = (
  apiKey: string,
  vaultId: string,
  credentialId: string,
  credential: EnvironmentVariableCredential,
): Effect.Effect<CredentialResponse, ClaudeAgentApiError> =>
  request({
    apiKey,
    method: 'POST',
    path: `/v1/vaults/${vaultId}/credentials/${credentialId}`,
    schema: CredentialResponse,
    body: credential,
  });

/** Archives a credential, purging the secret and freeing its name for a replacement. */
export const archiveVaultCredential = (
  apiKey: string,
  vaultId: string,
  credentialId: string,
): Effect.Effect<unknown, ClaudeAgentApiError> =>
  request({
    apiKey,
    method: 'POST',
    path: `/v1/vaults/${vaultId}/credentials/${credentialId}/archive`,
    schema: Ignored,
  });
