//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { proxyFetchLegacy } from '@dxos/edge-client';

import { ANTHROPIC_API_URL, ANTHROPIC_VERSION, MANAGED_AGENTS_BETA, REQUEST_TIMEOUT_MS } from '../constants';
import { ClaudeAgentApiError } from '../errors';
import { type AgentConfig, AgentResponse, EnvironmentResponse, EventPage, Ignored, SessionResponse } from './types';

type Request<A> = {
  apiKey: string;
  method: 'GET' | 'POST';
  path: string;
  schema: Schema.Codec<A>;
  body?: unknown;
};

/**
 * Single entry point for the Managed Agents control plane. Routed through the DXOS edge CORS proxy:
 * api.anthropic.com does not permit browser origins, and the proxy passes `x-api-key` through
 * unchanged. The response is decoded against `schema`, so a body missing a field the caller persists
 * fails here rather than downstream.
 */
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
  params: { agentId: string; environmentId: string; title?: string; message?: string },
): Effect.Effect<SessionResponse, ClaudeAgentApiError> =>
  request({
    apiKey,
    method: 'POST',
    path: '/v1/sessions',
    schema: SessionResponse,
    body: {
      agent: params.agentId,
      environment_id: params.environmentId,
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

/** Reads one page of session events, newest last. */
export const listEvents = (
  apiKey: string,
  sessionId: string,
  limit: number,
): Effect.Effect<EventPage, ClaudeAgentApiError> =>
  request({ apiKey, method: 'GET', path: `/v1/sessions/${sessionId}/events?limit=${limit}`, schema: EventPage });
