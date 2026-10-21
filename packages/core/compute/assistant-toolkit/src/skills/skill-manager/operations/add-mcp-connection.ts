//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import { McpToolkit } from '@dxos/mcp-client';

import { AddMcpConnection } from './definitions.ts';

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
      const apiKey = key?.trim() || undefined;

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

      const accessToken = apiKey
        ? yield* Database.add(Obj.make(AccessToken.AccessToken, { source, token: apiKey }))
        : undefined;
      const connection = yield* Database.add(
        Obj.make(Connection.Connection, {
          name: name ?? source,
          connectorId: MCP_CONNECTOR_ID,
          mcp: endpoint,
          ...(accessToken ? { accessToken: Ref.make(accessToken) } : {}),
        }),
      );
      if (accessToken) {
        Obj.setParent(accessToken, connection);
      }

      return {
        id: connection.id,
        name: connection.name,
        connectorId: connection.connectorId,
        enabled: true,
        ...(probe._tag === 'Success' ? { tools: probe.success.tools } : { problem: probe.failure.message }),
      };
    }),
  ),
);
