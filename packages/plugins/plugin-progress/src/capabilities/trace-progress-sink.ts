//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, type CancelTarget, createProgressTraceSink, resolveTriggerId } from '@dxos/app-toolkit';
import { Process, ServiceResolver, Trace } from '@dxos/compute';
import { ProcessManager, RemoteProcessManager } from '@dxos/compute-runtime';

/**
 * Contributes a {@link Capabilities.TraceSink} that projects `status.update` trace events into the
 * {@link AppCapabilities.ProgressRegistry}. Runs in parallel with the feed trace sink contributed by
 * `plugin-routine` — both are merged by the process-manager runtime.
 *
 * The meter's cancel routes by the emitting runtime ({@link Trace.isEdgeRuntime}): an edge-run trigger
 * is cancelled through the remote ({@link RemoteProcessManager}) control keyed by its trigger id; a
 * local process is terminated on this runtime's {@link ProcessManager}.
 *
 * Activates on `SetupProcessManager` so the factory is collected when the process-manager runtime
 * is built. {@link AppCapabilities.ProgressRegistry} is resolved lazily on each write — it is
 * contributed later on Startup, and waiting for it here would deadlock the Startup →
 * SetupProcessManager `firesBefore` chain. Process-manager runtime is likewise resolved lazily on
 * cancel.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilityManager = yield* Capability.Service;
    const runtime = yield* Effect.runtime<Capability.Service>();

    // Local branch: terminate the emitting process on this runtime's ProcessManager (interrupting the
    // operation's fiber). Unchanged from the former pid-only path.
    const terminateLocal = (pid: string) =>
      Effect.gen(function* () {
        const processManagerRuntime = yield* Capability.get(Capabilities.ProcessManagerRuntime);

        processManagerRuntime.runFork(
          Effect.gen(function* () {
            const manager = yield* ProcessManager.ProcessManagerService;
            const handle = yield* manager
              .attach(Process.ID.make(pid))
              .pipe(Effect.catchAll(() => Effect.succeed(undefined)));
            if (handle) {
              yield* handle.terminate();
            }
          }),
        );
      }).pipe(Effect.provide(runtime), Effect.runFork);

    // Edge branch: cancel the trigger's current run (in-flight execution + continuation chain) via the
    // remote process manager. A missing remote manager (local-only deployment) resolves to a no-op.
    const cancelRemote = (resolver: ServiceResolver.ServiceResolver, space: string, trigger: string, pid?: string) =>
      Effect.runFork(
        resolver.resolve(RemoteProcessManager.Service, {}).pipe(
          Effect.flatMap((manager) => manager.cancel?.({ space, trigger, pid }) ?? Effect.void),
          Effect.scoped,
          // No remote manager configured / unreachable — the meter has already cleared locally; drop.
          Effect.catchAll(() => Effect.void),
        ),
      );

    return Capability.contributes(Capabilities.TraceSink, ({ resolver }) =>
      createProgressTraceSink(() => capabilityManager.getAll(AppCapabilities.ProgressRegistry)[0], {
        cancelProcess: (target: CancelTarget) => {
          const triggerId = resolveTriggerId(target);
          if (target.runtimeName && Trace.isEdgeRuntime(target.runtimeName) && target.space && triggerId) {
            cancelRemote(resolver, target.space, triggerId, target.pid);
          } else if (target.pid) {
            terminateLocal(target.pid);
          }
        },
      }),
    );
  }),
);
