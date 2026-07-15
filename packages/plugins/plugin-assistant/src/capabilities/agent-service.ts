//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { McpServer } from '@dxos/assistant-toolkit';
import { asyncTimeout } from '@dxos/async';
import { AgentService, LayerSpec } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { Filter } from '@dxos/echo';
import { AgentService as AgentServiceRuntime } from '@dxos/functions-runtime';
import { ClientCapabilities } from '@dxos/plugin-client';
import { RoutineCapabilities } from '@dxos/plugin-routine';

/**
 * Upper bound on waiting for a space to become ready while resolving its MCP servers. The resolver
 * runs on every agent turn, so it must not block indefinitely on a space that never readies.
 */
const MCP_RESOLVER_READY_TIMEOUT = 10_000;

//
// Capability Module
//
// Owns the application-affinity {@link AgentService} layer for process-backed agents.
//

const AgentServiceSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [ProcessManager.ProcessManagerService, Capability.Service],
    provides: [AgentService.AgentService],
  },
  () =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        // Optional supervisor behaviour, contributed by a plugin that knows the agent/plan model.
        const strategies = yield* Capability.getAll(RoutineCapabilities.AgentDelegationStrategy);
        const client = yield* Capability.get(ClientCapabilities.Client).pipe(Effect.orDie);
        return AgentServiceRuntime.layer({
          delegationStrategy: strategies[0],
          // Expose each space's runtime-configured MCP servers (added via the chat MCP panel) to that
          // space's agent sessions. Resolved per request so servers added or toggled take effect live.
          // Space-scoped because this single application-wide service serves sessions across all spaces.
          getMcpServers: async (spaceId) => {
            const space = client.spaces.get(spaceId);
            if (!space) {
              return [];
            }
            // Skip MCP for this turn if the space does not ready in time rather than stalling the turn.
            try {
              await asyncTimeout(space.waitUntilReady(), MCP_RESOLVER_READY_TIMEOUT);
            } catch {
              return [];
            }
            const servers = await space.db.query(Filter.type(McpServer.McpServer)).run();
            return servers
              .filter((server) => server.enabled !== false)
              .map(({ url, protocol, apiKey }) => ({ url, protocol, apiKey }));
          },
        });
      }),
    ),
);

export default Capability.makeModule(() =>
  Effect.succeed([Capability.contributes(Capabilities.LayerSpec, AgentServiceSpec)]),
);
