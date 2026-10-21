//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { AiContext } from '@dxos/assistant';
import * as Credential from '@dxos/compute/Credential';
import * as McpServer from '@dxos/compute/McpServer';
import { Database, type Feed, Filter, type Ref } from '@dxos/echo';
import { type AccessToken, Connection } from '@dxos/link';
import { log } from '@dxos/log';
import { McpOAuth, type McpToolkit } from '@dxos/mcp-client';

/**
 * The MCP server a connection exposes. A host that knows the connector registry resolves a
 * connector's declared endpoint; without one only a custom MCP connection, which stores its own
 * endpoint, resolves.
 */
export type McpEndpointOf = (connection: Connection.Connection) => Connection.McpEndpoint | undefined;

export const storedMcpEndpoint: McpEndpointOf = (connection) => connection.mcp;

/**
 * The MCP servers a conversation connects, read at the start of every turn so a server added, toggled
 * or signed in to applies from the next turn on: every connection with an endpoint the conversation
 * has not turned off, then every enabled space `McpServer` at a URL no connection already covers.
 */
export const loadMcpServers = ({
  feed,
  endpointOf = storedMcpEndpoint,
}: {
  feed: Feed.Feed;
  endpointOf?: McpEndpointOf;
}): Effect.Effect<McpToolkit.Options[], never, Database.Service | Credential.CredentialsService> =>
  Effect.gen(function* () {
    const states = yield* AiContext.boundConnections(feed);
    const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
    const fromConnections = yield* Effect.forEach(
      connections.filter((connection) => AiContext.isConnectionOn(states, connection)),
      (connection) => {
        const endpoint = endpointOf(connection);
        return endpoint ? connectionOptions(connection, endpoint).pipe(Effect.map(Option.some)) : Effect.succeedNone;
      },
    ).pipe(Effect.map((options) => options.flatMap(Option.toArray)));

    const covered = new Set(fromConnections.map(({ url }) => url));
    const servers = yield* Database.query(Filter.type(McpServer.McpServer)).run;
    const fromServers = yield* Effect.forEach(
      servers.filter((server) => server.enabled !== false && !covered.has(server.url)),
      serverOptions,
    );
    return [...fromConnections, ...fromServers];
  });

const connectionOptions = (
  connection: Connection.Connection,
  { url, protocol }: Connection.McpEndpoint,
): Effect.Effect<McpToolkit.Options, never, Database.Service | Credential.CredentialsService> =>
  Effect.gen(function* () {
    if (!connection.accessToken) {
      return { url, protocol };
    }
    const apiKey = yield* resolveAccessToken(connection.accessToken);
    return Option.isSome(apiKey) ? { url, protocol, apiKey: apiKey.value } : { url, protocol };
  });

const serverOptions = (
  server: McpServer.McpServer,
): Effect.Effect<McpToolkit.Options, never, Database.Service | Credential.CredentialsService> =>
  Effect.gen(function* () {
    const options: McpToolkit.Options = { url: server.url, protocol: server.protocol, apiKey: server.apiKey };
    if (server.oauth?.tokens) {
      // No `onAuthorize`: the agent uses and refreshes the stored tokens but cannot start a sign-in.
      return { ...options, authProvider: McpOAuth.makeProvider({ store: McpServer.oauthStore(server) }) };
    }
    if (server.accessToken) {
      const apiKey = yield* resolveAccessToken(server.accessToken);
      return Option.isSome(apiKey) ? { ...options, apiKey: apiKey.value } : options;
    }
    return options;
  });

/**
 * Resolves through {@link Credential.CredentialsService} rather than reading `token` directly, so a
 * token EDGE custodies (a managed one) resolves the same way a pasted one does.
 */
const resolveAccessToken = (ref: Ref.Ref<AccessToken.AccessToken>) =>
  Effect.gen(function* () {
    const accessToken = yield* Database.load(ref);
    const credentials = yield* Credential.CredentialsService;
    const credential = yield* Effect.tryPromise(() => credentials.getCredential({ accessTokenId: accessToken.id }));
    return Option.fromNullishOr(credential.apiKey);
  }).pipe(
    // The connection then goes out without a key, and the server's 401 reports what is wrong.
    Effect.tapError((error) => Effect.sync(() => log.warn('failed to resolve MCP server credential', { error }))),
    Effect.orElseSucceed(() => Option.none<string>()),
  );
