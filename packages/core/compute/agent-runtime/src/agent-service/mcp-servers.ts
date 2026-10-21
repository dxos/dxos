//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { AiContext } from '@dxos/assistant';
import * as Credential from '@dxos/compute/Credential';
import { Database, type Feed, Filter, type Ref, Registry } from '@dxos/echo';
import { type AccessToken, Connection } from '@dxos/link';
import { log } from '@dxos/log';
import { type McpToolkit } from '@dxos/mcp-client';

/**
 * The MCP server a connection exposes. A host that knows the connector registry resolves a
 * connector's declared endpoint; without one only a custom MCP connection, which stores its own
 * endpoint, resolves.
 */
export type McpEndpointOf = (connection: Connection.Connection) => Connection.McpEndpoint | undefined;

export const storedMcpEndpoint: McpEndpointOf = (connection) => connection.mcp;

/**
 * The MCP servers a conversation connects, read at the start of every turn so a server added, toggled
 * or signed in to applies from the next turn on: every space connection with an endpoint the
 * conversation has not turned off, and every built-in server in the registry it has turned on. A host
 * without {@link Credential.CredentialsService} connects them without their credentials, and a server
 * that needs one answers 401.
 */
export const loadMcpServers = ({
  feed,
  endpointOf = storedMcpEndpoint,
}: {
  feed: Feed.Feed;
  endpointOf?: McpEndpointOf;
}): Effect.Effect<McpToolkit.Options[], never, Database.Service | Registry.Service> =>
  Effect.gen(function* () {
    const states = yield* AiContext.boundConnections(feed);
    const connections = [
      ...(yield* Database.query(Filter.type(Connection.Connection)).run),
      ...(yield* Registry.runQuery(Filter.type(Connection.Connection))).filter(Connection.isBuiltin),
    ];
    const servers = yield* Effect.forEach(
      connections.filter((connection) => AiContext.isConnectionOn(states, connection)),
      (connection) => {
        const endpoint = endpointOf(connection);
        return endpoint ? connectionOptions(connection, endpoint).pipe(Effect.map(Option.some)) : Effect.succeedNone;
      },
    );
    return servers.flatMap(Option.toArray);
  });

const connectionOptions = (
  connection: Connection.Connection,
  { url, protocol }: Connection.McpEndpoint,
): Effect.Effect<McpToolkit.Options, never, Database.Service> =>
  Effect.gen(function* () {
    if (!connection.accessToken) {
      return { url, protocol };
    }
    const apiKey = yield* resolveAccessToken(connection.accessToken);
    return Option.isSome(apiKey) ? { url, protocol, apiKey: apiKey.value } : { url, protocol };
  });

/**
 * Resolves through {@link Credential.CredentialsService} rather than reading `token` directly, so a
 * token EDGE custodies (a managed one) resolves the same way a pasted one does.
 */
const resolveAccessToken = (ref: Ref.Ref<AccessToken.AccessToken>) =>
  Effect.gen(function* () {
    const credentials = yield* Effect.serviceOption(Credential.CredentialsService);
    if (Option.isNone(credentials)) {
      return Option.none<string>();
    }
    const accessToken = yield* Database.load(ref);
    const credential = yield* Effect.tryPromise(() =>
      credentials.value.getCredential({ accessTokenId: accessToken.id }),
    );
    return Option.fromNullishOr(credential.apiKey);
  }).pipe(
    // The connection then goes out without a key, and the server's 401 reports what is wrong.
    Effect.tapError((error) => Effect.sync(() => log.warn('failed to resolve MCP server credential', { error }))),
    Effect.orElseSucceed(() => Option.none<string>()),
  );
