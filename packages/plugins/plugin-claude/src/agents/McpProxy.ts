//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as acp from '@agentclientprotocol/sdk';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { log } from '@dxos/log';
import { McpToolkit } from '@dxos/mcp-client';

import type * as ClaudeCapabilities from '../types/ClaudeCapabilities.ts';
import type * as AcpAgent from './AcpAgent.ts';
import * as Protocol from './Protocol.ts';

/** An MCP server the page reaches for an agent, and the credential it presents there. */
export type Upstream = { url: string; apiKey: string };

/** What an MCP client sends that the upstream server needs; the agent's own bearer is never among them. */
const FORWARDED_REQUEST = ['accept', 'content-type', 'last-event-id', 'mcp-protocol-version', 'mcp-session-id'];

/**
 * Response headers that no longer hold or that the agent must not act on: `fetch` hands back the body
 * decoded, and a challenge would send the agent to sign in to a server whose credential the page holds.
 */
const DROPPED_RESPONSE = ['content-encoding', 'content-length', 'transfer-encoding', 'www-authenticate'];

/** Statuses a `Response` must be built without a body for, an empty one included. */
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

/**
 * Serves `upstream()` to an agent, presenting the connection's credential in place of the token the
 * agent showed the helper, so the credential stays in the page. Read per request, so a credential
 * refreshed between turns applies to the next request.
 *
 * The relay answers with whole bodies, so the standing stream an agent opens with a `GET` is refused
 * with the 405 that tells an MCP client the server offers none.
 */
export const handler =
  (upstream: () => Upstream): ClaudeCapabilities.McpHandle =>
  async (request) => {
    if (request.method === 'GET') {
      return new Response(null, { status: 405, headers: { allow: 'POST, DELETE' } });
    }
    const { url, apiKey } = upstream();
    const headers = new Headers({ authorization: `Bearer ${apiKey}` });
    for (const name of FORWARDED_REQUEST) {
      const value = request.headers.get(name);
      if (value !== null) {
        headers.set(name, value);
      }
    }
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.method === 'DELETE' ? undefined : await request.text(),
    });
    const answer = new Headers(response.headers);
    DROPPED_RESPONSE.forEach((name) => answer.delete(name));
    const body = NULL_BODY_STATUSES.has(response.status) ? null : await response.text();
    return new Response(body, { status: response.status, headers: answer });
  };

type Proxy = { server: string; upstream: Upstream };

export type ProxiesOptions = {
  /** The helper's MCP relay, when there is a helper. */
  relay: () => ClaudeCapabilities.AgentHelper['mcp'] | undefined;
  /** A new relay server id. */
  serverId: () => string;
  /** Names the agent already gives a server, which a connection's server must not take. */
  reserved?: readonly string[];
};

/**
 * The MCP servers of each chat's connections, as an agent reaches them. A server that needs no
 * credential is the agent's to reach directly. One that needs a credential is served through the
 * page, since the agent's MCP config is public and the credential must not be in it.
 */
export class Proxies {
  /** Per chat, the proxy of each server whose credential stays in the page, by the name it is offered under. */
  readonly #chats = new Map<string, Map<string, Proxy>>();
  readonly #options: ProxiesOptions;

  constructor(options: ProxiesOptions) {
    this.#options = options;
  }

  /**
   * The chat's servers as the agent should be configured with them, a proxied one reached with
   * `token`, the bearer the chat's latest session presents. Call it each turn: a credential refreshed
   * since applies from the next request on, and a server the chat no longer uses stops being served.
   */
  offer(chat: string, servers: readonly AcpAgent.McpConnection[], token?: string): Effect.Effect<acp.McpServer[]> {
    return Effect.gen({ self: this }, function* () {
      const relay = this.#options.relay();
      const proxies = this.#chats.get(chat) ?? new Map<string, Proxy>();
      this.#chats.set(chat, proxies);
      const names = new Set(this.#options.reserved);
      const offered: acp.McpServer[] = [];
      const proxied = new Set<string>();
      for (const { url, protocol, name: label, apiKey } of servers) {
        const name = uniqueName(names, label, url);
        if (apiKey === undefined) {
          offered.push({ type: protocol, name, url, headers: [] });
          continue;
        }
        // The relay answers with whole bodies, which a server sending events over SSE never finishes. A
        // credential goes only where Composer's own agent would send it.
        if (protocol !== 'http' || !McpToolkit.isSecureUrl(url) || !relay || !token) {
          log.warn('MCP connection not offered to the agent', { chat, url, protocol });
          continue;
        }
        // By name, not URL: two connections to one server are two accounts, each with its own credential.
        const proxy = proxies.get(name) ?? { server: this.#options.serverId(), upstream: { url, apiKey } };
        proxy.upstream = { url, apiKey };
        proxies.set(name, proxy);
        proxied.add(name);
        const reached = yield* relay
          .serve(
            proxy.server,
            handler(() => proxy.upstream),
            token,
          )
          .pipe(
            Effect.tapError((error) =>
              Effect.sync(() => log.warn('MCP connection not served to the agent', { chat, url, error })),
            ),
            Effect.option,
          );
        if (Option.isSome(reached)) {
          offered.push({
            type: 'http',
            name,
            url: reached.value.url,
            // Named, not held, as for Composer's own server: the agent expands it from its environment.
            headers: [{ name: 'Authorization', value: `Bearer \${${Protocol.MCP_TOKEN_ENV}}` }],
          });
        }
      }
      for (const [name, { server }] of proxies) {
        if (!proxied.has(name)) {
          proxies.delete(name);
          yield* relay?.close(server) ?? Effect.void;
        }
      }
      return offered;
    });
  }

  /** Stops serving every proxy. */
  close(): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      const servers = [...this.#chats.values()].flatMap((proxies) => [...proxies.values()]);
      this.#chats.clear();
      const relay = this.#options.relay();
      if (relay) {
        yield* Effect.forEach(servers, ({ server }) => relay.close(server), { discard: true });
      }
    });
  }
}

/**
 * An MCP server's name in the agent, which prefixes its tools there (`mcp__<name>__<tool>`): the name
 * Composer gave it, unique over all the space's connections, or a label of its host; either made unique
 * among `taken`.
 */
const uniqueName = (taken: Set<string>, given: string | undefined, url: string): string => {
  const base = given ?? McpToolkit.label(URL.canParse(url) ? new URL(url).hostname : 'mcp');
  let name = base;
  for (let index = 2; taken.has(name); index++) {
    name = `${base}-${index}`;
  }
  taken.add(name);
  return name;
};
