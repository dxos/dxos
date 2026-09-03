//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as McpProtocol from 'effect/unstable/ai/McpProtocol';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import { CommandConfig } from '@dxos/cli-util';
import { DXOS_VERSION } from '@dxos/client';
import { Registry } from '@dxos/echo';
import { log } from '@dxos/log';
import { McpServer } from '@dxos/mcp-server';
import * as ProjectsEvents from '@dxos/plugin-projects/ProjectsEvents';
import { isRecordEnabled, loadPlugins } from '@dxos/plugin-registry';

import { makeLocalServer } from './local-server';
import { SpaceToolkit, spaceHandlers } from './space-tools';
import { WATCH_CHILD_ENV, formatReady } from './watch-protocol';

/**
 * Names of the statically-defined tools; the projection refuses to build if one of them collides
 * with a name it defines. `whoami` is the last of them — the operation verbs are not tools at all
 * any more, but rows `queryOperations` returns and `invokeOperation` dispatches, and the session's
 * identity is the one fact a plugin operation cannot reach, since EDGE resolves it from an OAuth
 * grant rather than from a local client.
 */
const STATIC_TOOL_NAMES = ['whoami'] as const;

declare global {
  /**
   * Substituted with `true` by the `define` in `scripts/build.ts`, so only the compiled binary sees
   * it; running from source leaves it `undefined`. A global rather than an env var because the
   * substitution happens while bun bundles, and because nothing should be able to flip it from the
   * environment. It selects the watch strategy: a binary has no sources for `bun --watch` to track,
   * so it supervises a copy of itself and watches its dev-installed plugins instead.
   */
  // eslint-disable-next-line no-var
  var DX_CLI_BUNDLED: boolean | undefined;
}

/**
 * What `--watch` reloads on differs by build, so the description does too: from source the whole
 * imported graph is live, while the binary can only change through its dev-installed plugins.
 */
const watchOption = Options.boolean('watch').pipe(
  Options.withDescription(
    globalThis.DX_CLI_BUNDLED
      ? 'Restart the server when a dev-installed plugin changes.'
      : 'Restart the server when sources change.',
  ),
  Options.withDefault(false),
);

/**
 * Directories of the profile's dev-installed plugins — the only on-disk code a running server can
 * see change. A `copy` install is a snapshot the CLI owns and only `add` rewrites, and a
 * compiled-in plugin cannot change at all, so neither is worth a watch.
 */
const devPluginPaths = Effect.gen(function* () {
  const { profile } = yield* CommandConfig;
  const records = (yield* loadPlugins({ profile })) ?? [];
  return records.flatMap((record) =>
    isRecordEnabled(record) && record.source?.kind === 'link' ? [record.source.path] : [],
  );
});

export const serve = Command.make(
  'serve',
  { watch: watchOption },
  Effect.fn(function* ({ watch }) {
    if (watch) {
      // Imported here rather than at the top so the supervisor is absent from the module graph of
      // the child it supervises, which would otherwise reload itself on every one of its own edits.
      const { runWatchSupervisor } = yield* Effect.promise(() => import('./watch'));
      return yield* runWatchSupervisor();
    }

    const manager = yield* Capability.get(Capabilities.PluginManager);
    // Building the command tree only fires `Startup`; operation handlers default to `Idle` and
    // skill definitions to `AssistantStart`, so without both the projected surface is empty.
    yield* manager.activate(ActivationEvents.Idle);
    yield* manager.activate(AppActivationEvents.AssistantStart);
    yield* manager.activate(ProjectsEvents.Start);

    const server = yield* makeLocalServer();
    // stdout carries the protocol, so progress goes to the log (stderr).
    log.info('serving MCP over stdio', { spaces: server.host.spaceIds.length });

    const staticToolkits = McpServer.toolkit(SpaceToolkit).pipe(
      Layer.provide(SpaceToolkit.toLayer(spaceHandlers(server))),
    );

    // Written before the transport blocks: the child's stdin is a pipe, so anything the supervisor
    // sends on the strength of this line waits in the buffer until the server reads it.
    if (process.env[WATCH_CHILD_ENV]) {
      process.stderr.write(`${formatReady({ watch: yield* devPluginPaths })}\n`);
    }

    return yield* Layer.launch(
      Layer.mergeAll(
        McpServer.layer({ reservedToolNames: STATIC_TOOL_NAMES }).pipe(
          Layer.provide(
            Layer.mergeAll(
              Layer.succeed(Registry.Service, server.registry),
              Layer.succeed(McpServer.Host, server.host),
            ),
          ),
        ),
        staticToolkits,
      ).pipe(
        Layer.provide(
          McpServer.layerStdio({
            name: McpServer.identity.name,
            version: DXOS_VERSION,
            protocols: [McpProtocol.v2025_06_18],
          }),
        ),
        Layer.provide(McpServer.stdio),
      ),
    );
  }),
).pipe(
  Command.withDescription("Run the DXOS MCP server locally over stdio, against this profile's identity and spaces."),
);
