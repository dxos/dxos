//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as McpProtocol from 'effect/unstable/ai/McpProtocol';
import * as McpServer from 'effect/unstable/ai/McpServer';
import * as Command from 'effect/unstable/cli/Command';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import { DXOS_VERSION } from '@dxos/client';
import { log } from '@dxos/log';
import { Gateway, Server } from '@dxos/mcp-server';

import { DiscoveryToolkit, discoveryHandlers } from './discovery-tools';
import { makeGateway } from './gateway';
import { SpaceToolkit, spaceHandlers } from './space-tools';

/**
 * Names of the statically-defined tools; projected operations must not collide with them.
 * Task and project verbs are deliberately absent — they arrive via the annotation projection.
 */
const STATIC_TOOL_NAMES = ['whoami', 'listSpaces', 'listPlugins', 'listTypes', 'listOperations'] as const;

export const serve = Command.make(
  'serve',
  {},
  Effect.fn(function* () {
    const manager = yield* Capability.get(Capabilities.PluginManager);
    // Building the command tree only fires `Startup`; operation handlers default to `Idle` and
    // skill definitions to `AssistantStart`, so without both the projected surface is empty.
    yield* manager.activate(ActivationEvents.Idle);
    yield* manager.activate(AppActivationEvents.AssistantStart);

    const gateway = yield* makeGateway();
    // stdout carries the protocol, so progress goes to the log (stderr).
    log.info('serving MCP over stdio', { spaces: gateway.spaceIds.length });

    const staticToolkits = Layer.mergeAll(
      McpServer.toolkit(SpaceToolkit).pipe(Layer.provide(SpaceToolkit.toLayer(spaceHandlers(gateway)))),
      McpServer.toolkit(DiscoveryToolkit).pipe(Layer.provide(DiscoveryToolkit.toLayer(discoveryHandlers(gateway)))),
    );

    yield* Layer.launch(
      Layer.mergeAll(
        Server.layer({ reservedToolNames: STATIC_TOOL_NAMES }).pipe(
          Layer.provide(Layer.succeed(Gateway.Service, gateway)),
        ),
        staticToolkits,
      ).pipe(
        Layer.provide(
          McpServer.layerStdio({
            name: Server.identity.name,
            version: DXOS_VERSION,
            protocols: [McpProtocol.v2025_06_18],
          }),
        ),
        Layer.provide(Server.stdio),
      ),
    );
  }),
).pipe(
  Command.withDescription("Run the DXOS MCP server locally over stdio, against this profile's identity and spaces."),
);
