//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { identity } from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as McpProtocol from 'effect/unstable/ai/McpProtocol';
import * as McpServer from 'effect/unstable/ai/McpServer';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import { DXOS_VERSION } from '@dxos/client';
import { log } from '@dxos/log';
import { Gateway, Server } from '@dxos/mcp-server';

import { DiscoveryToolkit, discoveryHandlers } from './discovery-tools';
import { makeGateway } from './gateway';
import { ObjectToolkit, objectHandlers } from './object-tools';
import { SpaceToolkit, spaceHandlers } from './space-tools';
import { WATCH_CHILD_ENV, WATCH_READY_SENTINEL } from './watch-protocol';

/**
 * Names of the statically-defined tools; projected operations must not collide with them.
 * Task and project verbs are deliberately absent — they arrive via the annotation projection.
 */
const STATIC_TOOL_NAMES = [
  'whoami',
  'listSpaces',
  'createObject',
  'getObject',
  'updateObject',
  'deleteObject',
  'queryObjects',
  'listPlugins',
  'listTypes',
  'listOperations',
] as const;

/**
 * `--watch` supervises a `bun --watch` child, so it only means anything when the CLI runs from
 * source. `scripts/build.ts` defines `process.env.DX_CLI_BUNDLED` for the compiled binary, which
 * both hides the flag from `--help` there and lets bun drop the supervisor from the bundle.
 */
const watchOption = Options.boolean('watch').pipe(
  Options.withDescription('Restart the server when sources change (requires running from source).'),
  Options.withDefault(false),
  process.env.DX_CLI_BUNDLED ? Options.withHidden : identity,
);

export const serve = Command.make(
  'serve',
  { watch: watchOption },
  Effect.fn(function* ({ watch }) {
    if (watch) {
      if (process.env.DX_CLI_BUNDLED) {
        return yield* Effect.fail(
          new Error('`--watch` is only available when running the CLI from source (packages/devtools/cli/bin/dx).'),
        );
      } else {
        // Dynamic so the branch, and the supervisor with it, is eliminated from the binary.
        const { runWatchSupervisor } = yield* Effect.promise(() => import('./watch'));
        return yield* runWatchSupervisor();
      }
    }

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
      McpServer.toolkit(ObjectToolkit).pipe(Layer.provide(ObjectToolkit.toLayer(objectHandlers(gateway)))),
      McpServer.toolkit(DiscoveryToolkit).pipe(Layer.provide(DiscoveryToolkit.toLayer(discoveryHandlers(gateway)))),
    );

    // Written before the transport blocks: the child's stdin is a pipe, so anything the supervisor
    // sends on the strength of this line waits in the buffer until the server reads it.
    if (process.env[WATCH_CHILD_ENV]) {
      process.stderr.write(`${WATCH_READY_SENTINEL}\n`);
    }

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
