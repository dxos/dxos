//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Connection } from '@dxos/link';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

/**
 * Adds the MCP servers plugins ship to `client.graph.registry` as keyed connections, where chats and
 * the agent runtime find them; a server already added is not added again.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const atomRegistry = yield* Capabilities.AtomRegistry;
    const serversAtom = yield* Capability.atom(AppCapabilities.McpServer);
    const added = new Set<string>();
    atomRegistry.subscribe(
      serversAtom,
      (servers) => {
        const fresh = servers.filter(({ key }) => !added.has(key));
        if (fresh.length > 0) {
          fresh.forEach(({ key }) => added.add(key));
          client.graph.registry.add(fresh.map(Connection.makeBuiltin));
        }
      },
      { immediate: true },
    );

    return [];
  }),
);
