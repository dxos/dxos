//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { AiContext, Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import { McpToolkit } from '@dxos/mcp-client';

import { AddMcpConnection } from './definitions.ts';
import { describe } from './mcp-connections.ts';

/** Matches the Custom MCP Server connector, so the connection lists and behaves as one the user added. */
const MCP_CONNECTOR_ID = 'mcp';

export default AddMcpConnection.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ url, name, protocol = 'http', key }) {
      const endpoint: Connection.McpEndpoint = { url: url.trim(), protocol };
      if (!URL.canParse(endpoint.url)) {
        return yield* Effect.die(new Error(`Not a URL: ${url}`));
      }
      const source = new URL(endpoint.url).host;
      // A second connection to a server the space has would offer each of its tools twice, under two
      // names; the existing one is updated instead.
      const existing = (yield* Database.query(Filter.type(Connection.Connection)).run).find(
        (connection) => connection.connectorId === MCP_CONNECTOR_ID && connection.mcp?.url === endpoint.url,
      );
      const stored = existing?.accessToken
        ? yield* Database.load(existing.accessToken).pipe(Effect.option)
        : Option.none();
      const newKey = key?.trim() || undefined;
      const apiKey = newKey ?? Option.getOrUndefined(Option.map(stored, ({ token }) => token));

      // Only a refusal of credentials stops the add: a server that is down, or blocks this network,
      // may still answer the agent's turns.
      const probe = yield* McpToolkit.probe({ ...endpoint, apiKey }).pipe(Effect.result);
      if (probe._tag === 'Failure' && probe.failure.unauthorized) {
        return yield* Effect.die(
          new Error(
            apiKey
              ? 'The MCP server rejected this API key.'
              : 'The MCP server needs sign-in. Ask the user to connect it with Connect, then Custom MCP Server.',
          ),
        );
      }

      const connection =
        existing ??
        (yield* Database.add(
          Obj.make(Connection.Connection, { name: name ?? source, connectorId: MCP_CONNECTOR_ID, mcp: endpoint }),
        ));
      // The reply describes the endpoint that answered, so a re-add keeps that one.
      if (existing && existing.mcp?.protocol !== endpoint.protocol) {
        Obj.update(existing, (existing) => {
          existing.mcp = endpoint;
        });
      }
      if (newKey) {
        const accessToken = yield* Database.add(Obj.make(AccessToken.AccessToken, { source, token: newKey }));
        Obj.update(connection, (connection) => {
          connection.accessToken = Ref.make(accessToken);
        });
        Obj.setParent(accessToken, connection);
        // The key it replaces stays readable by every member until it is removed.
        if (Option.isSome(stored)) {
          yield* Database.remove(stored.value);
        }
      }

      const binder = yield* Harness.binder.pipe(Effect.orDie);
      yield* Effect.promise(() => binder.setConnection(AiContext.connectionRef(connection), true));
      return {
        ...describe(connection, binder.getConnections()),
        ...(probe._tag === 'Success' ? { tools: probe.success.tools } : { problem: probe.failure.message }),
      };
    }),
  ),
);
