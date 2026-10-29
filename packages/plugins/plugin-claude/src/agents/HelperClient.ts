//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { createWebSocketStream } from '@agentclientprotocol/sdk/experimental/ws-client';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as EffectEx from '@dxos/effect/EffectEx';

import { AgentError } from '../errors.ts';
import type * as ClaudeCapabilities from '../types/ClaudeCapabilities.ts';
import * as McpRelay from './McpRelay.ts';
import * as Protocol from './Protocol.ts';

/** Where a running agent server answers, the token every request to it carries, and the host's default folder. */
export type Endpoint = { port: number; token: string; folder?: string };

export type HelperClient = {
  helper: ClaudeCapabilities.AgentHelper;
  /** Forgets the endpoint, so the next request starts the server again; for a host whose server has exited. */
  reset: () => void;
  /** The endpoint of the current start, if one has been made. */
  current: () => Promise<Endpoint> | undefined;
};

const HelperRefusal = Schema.Struct({ error: Schema.String });

/**
 * An {@link ClaudeCapabilities.AgentHelper} over an agent server (`agent-helper/server.ts`), wherever that runs: the
 * desktop app's sidecar or a dev server's route. `start` brings the server up and reports its endpoint; it is called on
 * first use and again after a failed start or a {@link HelperClient.reset}.
 */
export const make = (start: () => Promise<Endpoint>): HelperClient => {
  let current: Promise<Endpoint> | undefined;

  const endpoint = Effect.tryPromise({
    try: () =>
      (current ??= start().catch((error) => {
        current = undefined;
        throw error;
      })),
    catch: (cause) =>
      new AgentError({
        message: `could not start the agent helper: ${cause instanceof Error ? cause.message : String(cause)}`,
        cause,
      }),
  });

  /** One request to the server, its JSON answer decoded with `schema`. */
  const call = <A>(label: string, path: string, schema: Schema.Codec<A>, init: RequestInit = {}) =>
    endpoint.pipe(
      Effect.flatMap(({ port, token }) =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch(`http://localhost:${port}${path}`, {
              ...init,
              headers: {
                authorization: `Bearer ${token}`,
                ...(init.body !== undefined && { 'content-type': 'application/json' }),
              },
            }).catch((error: unknown) => {
              // Nothing listens there any more (the server exited, or its host restarted it elsewhere): ask the host again next time.
              current = undefined;
              throw error;
            });
            // A refusal that is not JSON (a proxy's page, a crash) still reports its status.
            const body: unknown = await response.json().catch(() => undefined);
            if (!response.ok) {
              const refusal = Schema.decodeUnknownOption(HelperRefusal)(body);
              throw new Error(
                Option.isSome(refusal) ? refusal.value.error : `agent helper answered ${response.status}`,
              );
            }
            return Schema.decodeUnknownSync(schema)(body);
          },
          catch: (cause) =>
            new AgentError({
              message: `${label}: ${cause instanceof Error ? cause.message : String(cause)}`,
              cause,
            }),
        }),
      ),
    );

  const agents = call('could not list coding agents', Protocol.AGENTS_PATH, Schema.Array(Protocol.AgentStatus));

  const worktrees: ClaudeCapabilities.AgentHelper['worktrees'] = {
    ensure: (request) =>
      call('could not prepare a worktree', Protocol.WORKTREES_PATH, Protocol.Worktree, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    remove: (key) =>
      call(
        'could not remove a worktree',
        `${Protocol.WORKTREES_PATH}?${new URLSearchParams({ key })}`,
        Schema.Struct({ outcome: Protocol.WorktreeOutcome }),
        { method: 'DELETE' },
      ).pipe(Effect.map(({ outcome }) => outcome)),
    list: call('could not list worktrees', Protocol.WORKTREES_PATH, Schema.Array(Protocol.Worktree)),
  };

  // The page's one connection for MCP: the server relays every agent's requests over it.
  const relay = new McpRelay.Relay(() =>
    EffectEx.runPromise(endpoint).then(({ port, token }) => ({
      url: `ws://localhost:${port}${Protocol.MCP_HOST_PATH}`,
      token,
    })),
  );
  const mcp: ClaudeCapabilities.AgentHelper['mcp'] = {
    serve: (server, handle, token) =>
      endpoint.pipe(
        Effect.flatMap(({ port }) =>
          Effect.tryPromise({
            try: () => relay.serve(server, handle, token),
            catch: (cause) => new AgentError({ message: 'could not serve Composer tools to the agent', cause }),
          }).pipe(Effect.as({ url: `http://localhost:${port}${Protocol.MCP_PATH}/${server}` })),
        ),
      ),
    close: (server) => Effect.promise(() => relay.close(server)),
  };

  const connect = (agent: string, cwd: string, mcpToken?: string) =>
    endpoint.pipe(
      Effect.map(({ port, token }) =>
        createWebSocketStream(Protocol.acpUrl({ port, agent, cwd, mcpToken }), {
          protocols: [Protocol.SUBPROTOCOL, Protocol.tokenProtocol(token)],
        }),
      ),
    );

  const defaultFolder = endpoint.pipe(Effect.map(({ folder }) => folder));

  return {
    helper: { agents, defaultFolder, connect, worktrees, mcp },
    reset: () => {
      current = undefined;
    },
    current: () => current,
  };
};
