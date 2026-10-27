//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { AiContext, AiSession } from '@dxos/assistant';
import * as Credential from '@dxos/compute/Credential';
import { Database, type Feed, Filter, Obj, type Ref, Registry } from '@dxos/echo';
import { type AccessToken, Connection } from '@dxos/link';
import { log } from '@dxos/log';
import { McpToolkit } from '@dxos/mcp-client';

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
 * conversation has not turned off, and every built-in server in the registry it has turned on. A
 * connection whose key is gone or cannot be read is left out for that read, never offered without it.
 */
export const loadMcpServers = ({
  feed,
  endpointOf = storedMcpEndpoint,
}: {
  feed: Feed.Feed;
  endpointOf?: McpEndpointOf;
}): Effect.Effect<
  McpToolkit.Options[],
  AiSession.McpServersUnavailable,
  Database.Service | Registry.Service | Credential.CredentialsService
> =>
  Effect.gen(function* () {
    const { states, connections } = yield* readConnections(feed);
    const names = nameConnections(connections, endpointOf);
    const servers = yield* Effect.forEach(
      connections.filter((connection) => AiContext.isConnectionOn(states, connection)),
      (connection) => {
        const endpoint = endpointOf(connection);
        const name = names.get(connection);
        return endpoint && name ? connectionOptions(connection, endpoint, name) : Effect.succeedNone;
      },
    );
    return servers.flatMap(Option.toArray);
  });

/**
 * Names each server after its connection, made unique over every connection and not only the ones that
 * are on, so a server's tools keep their names (`mcp__<name>__<tool>`) whichever others a chat switches.
 * Built-ins come first, by key, then the space's connections in the order they were added.
 */
const nameConnections = (
  connections: readonly Connection.Connection[],
  endpointOf: McpEndpointOf,
): Map<Connection.Connection, string> => {
  const names = new Map<Connection.Connection, string>();
  const taken = new Set<string>();
  for (const connection of connections) {
    const endpoint = endpointOf(connection);
    const host = endpoint && URL.canParse(endpoint.url) ? new URL(endpoint.url).hostname : undefined;
    const base = McpToolkit.label(connection.name ?? host ?? connection.connectorId ?? 'mcp');
    let name = base;
    for (let index = 2; taken.has(name); index++) {
      name = `${base}-${index}`;
    }
    taken.add(name);
    names.set(connection, name);
  }
  return names;
};

/** Reads that wait on the index, which can time out under load: reported as unavailable, not as no servers. */
const readConnections = (feed: Feed.Feed) =>
  Effect.gen(function* () {
    const states = yield* AiContext.boundConnections(feed);
    const builtins = (yield* Registry.runQuery(Filter.type(Connection.Connection))).filter(Connection.isBuiltin);
    const space = yield* Database.query(Filter.type(Connection.Connection)).run;
    const connections = [
      ...builtins.sort((left, right) => keyOf(left).localeCompare(keyOf(right))),
      ...space.sort((left, right) => left.id.localeCompare(right.id)),
    ];
    return { states, connections };
  }).pipe(Effect.catchDefect((error) => Effect.fail(unavailable(error))));

const keyOf = (connection: Connection.Connection): string => Obj.getMeta(connection).key ?? '';

const unavailable = (error: unknown) =>
  new AiSession.McpServersUnavailable({ message: error instanceof Error ? error.message : String(error) });

const connectionOptions = (
  connection: Connection.Connection,
  { url, protocol }: Connection.McpEndpoint,
  name: string,
): Effect.Effect<Option.Option<McpToolkit.Options>, never, Database.Service | Credential.CredentialsService> =>
  Effect.gen(function* () {
    const server = { url, protocol, name };
    if (!connection.accessToken) {
      return Option.some(server);
    }
    const credentials = yield* Credential.CredentialsService;
    const apiKey = yield* resolveAccessToken(credentials, connection.accessToken).pipe(
      Effect.tapError((reason) => Effect.sync(() => log.warn('MCP connection left out', { url, reason }))),
      Effect.option,
    );
    // Never offered without its key: a server that wants one would send the agent to sign in to it itself.
    return Option.map(apiKey, (apiKey) => ({ ...server, apiKey }));
  });

/**
 * Resolves through {@link Credential.CredentialsService} rather than reading `token` directly, so a
 * token EDGE custodies (a managed one) resolves the same way a pasted one does. Fails with why when the
 * token or its key is gone or cannot be read, which concerns this connection alone.
 */
const resolveAccessToken = (
  credentials: Credential.CredentialsService['Service'],
  ref: Ref.Ref<AccessToken.AccessToken>,
): Effect.Effect<string, string, Database.Service> =>
  Effect.gen(function* () {
    const accessToken = yield* Database.load(ref).pipe(Effect.mapError(() => 'its key is gone'));
    const credential = yield* Effect.tryPromise({
      try: () => credentials.getCredential({ accessTokenId: accessToken.id }),
      catch: (error) => `its key could not be read: ${error instanceof Error ? error.message : String(error)}`,
    });
    return credential.apiKey ?? (yield* Effect.fail('its key is gone'));
  }).pipe(
    Effect.catchDefect((error) =>
      Effect.fail(`its key could not be read: ${error instanceof Error ? error.message : String(error)}`),
    ),
  );
