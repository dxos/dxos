//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { type CancelTarget, createProgressTraceSink, resolveTriggerId } from '@dxos/app-toolkit';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { ProcessManager, RemoteProcessManager } from '@dxos/compute-runtime';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { log } from '@dxos/log';

/**
 * Contributes a {@link Capabilities.TraceSink} that projects `status.update` trace events into the
 * {@link AppCapabilities.ProgressRegistry}. Runs in parallel with the feed trace sink contributed by
 * `plugin-routine` — both are merged by the process-manager runtime.
 *
 * The meter's cancel routes by the emitting runtime ({@link Trace.isEdgeRuntime}): an edge-run trigger
 * is cancelled through the remote ({@link RemoteProcessManager}) control keyed by its trigger id; a
 * local process is terminated on this runtime's {@link ProcessManager}.
 *
 * {@link AppCapabilities.ProgressRegistry} is resolved lazily on each write rather than required
 * upfront, since the factory itself has no dependencies. Process-manager runtime is likewise
 * resolved lazily on cancel.
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
          // Soft-fail (the meter has already cleared locally) but never silently: an unresolvable
          // manager or a rejected request means the run may still be going on the edge.
          Effect.catchAllCause((cause) =>
            Effect.sync(() => log.warn('edge progress cancel failed', { space, trigger, pid, cause })),
          ),
        ),
      );

    return [
      Capability.contribute(Capabilities.TraceSink, ({ resolver }) =>
        createProgressTraceSink(() => capabilityManager.getAll(AppCapabilities.ProgressRegistry)[0], {
          cancelProcess: (target: CancelTarget) => {
            // An edge target never falls through to local terminate: its pid names a process on the
            // edge runtime, so terminating that id here could only hit an unrelated local process.
            if (target.runtimeName && Trace.isEdgeRuntime(target.runtimeName)) {
              const triggerId = resolveTriggerId(target);
              if (target.space && triggerId) {
                cancelRemote(resolver, target.space, triggerId, target.pid);
              } else {
                log.warn('edge progress cancel dropped: unresolvable target', {
                  space: target.space,
                  trigger: target.trigger?.uri.toString(),
                  pid: target.pid,
                });
              }
            } else if (target.pid) {
              terminateLocal(target.pid);
            }
          },
        }),
      ),
    ];
  }),
);
