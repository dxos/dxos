//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, type CancelTarget, createProgressTraceSink, resolveTriggerId } from '@dxos/app-toolkit';
import { Trace } from '@dxos/compute';
import { RemoteProcessManager } from '@dxos/compute-runtime';
import { log } from '@dxos/log';

/**
 * Projects remote (edge-runtime) `status.update` trace events into the {@link AppCapabilities.ProgressRegistry}
 * (DX-1125). Subscribes to the aggregate {@link Process.Monitor.subscribeToTraceMessages}, whose remote
 * source is the swarm-backed monitor contributed by `remote-trace-monitor`.
 *
 * Only edge-runtime messages are projected here: local progress already flows through the
 * `plugin-progress` trace sink, and both write the same progress keys — projecting local messages
 * twice would let two writers clobber each other's registry handles.
 *
 * Cancel on this path always routes to {@link RemoteProcessManager} (edge) — local terminate is
 * handled by the `plugin-progress` sink, which never sees these messages.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilityManager = yield* Capability.Service;
    const monitor = yield* Capability.get(Capabilities.ProcessMonitor);
    const processManagerRuntime = yield* Capability.get(Capabilities.ProcessManagerRuntime);
    const resolver = yield* Capability.get(Capabilities.ServiceResolver);

    // Edge-only cancel: the meter has already cleared locally; a missing remote manager is a no-op.
    const cancelRemote = (space: string, trigger: string, pid?: string) =>
      Effect.runFork(
        resolver.resolve(RemoteProcessManager.Service, {}).pipe(
          Effect.flatMap((manager) => manager.cancel?.({ space, trigger, pid }) ?? Effect.void),
          Effect.scoped,
          Effect.catchAll(() => Effect.void),
        ),
      );

    const progressSink = createProgressTraceSink(() => capabilityManager.getAll(AppCapabilities.ProgressRegistry)[0], {
      // An edge run is a chain of bounded invocations, each with a fresh pid, so a pid tombstone
      // would only mask one chain link and the next would resurrect the meter — suppress the key
      // until the run's terminal status, matching the local (single-pid) cancel behaviour.
      cancelScope: 'run',
      cancelProcess: (target: CancelTarget) => {
        const triggerId = resolveTriggerId(target);
        if (target.space && triggerId) {
          cancelRemote(target.space, triggerId, target.pid);
        } else {
          // Never drop a user's cancel silently — an unresolvable target means the trace meta lost
          // its addressing (e.g. the swarm wire codec), which must surface in the log.
          log.warn('edge progress cancel dropped: unresolvable target', {
            space: target.space,
            trigger: target.trigger?.uri.toString(),
            pid: target.pid,
          });
        }
      },
    });

    // TODO(mykola): Possible bug source. Use `Effect.forkDaemon`.
    const fiber = processManagerRuntime.runFork(
      monitor.subscribeToTraceMessages({ type: Trace.StatusUpdate.key }).pipe(
        Stream.runForEach((message) =>
          Effect.sync(() => {
            const runtimeName = message.meta.runtimeName;
            if (runtimeName && Trace.isEdgeRuntime(runtimeName)) {
              progressSink.write(message);
            }
          }),
        ),
      ),
    );

    yield* Effect.addFinalizer(() => Fiber.interrupt(fiber));
  }),
);
