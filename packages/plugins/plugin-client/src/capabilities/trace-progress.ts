//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, createProgressTraceSink } from '@dxos/app-toolkit';
import { Trace } from '@dxos/compute';

/**
 * Projects remote (edge-runtime) `status.update` trace events into the {@link AppCapabilities.ProgressRegistry}
 * (DX-1125). Subscribes to the aggregate {@link Process.Monitor.subscribeToTraceMessages}, whose remote
 * source is the swarm-backed monitor contributed by `remote-trace-monitor`.
 *
 * Only edge-runtime messages are projected here: local progress already flows through the
 * `plugin-progress` trace sink, and both write the same progress keys — projecting local messages
 * twice would let two writers clobber each other's registry handles.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilityManager = yield* Capability.Service;
    const monitor = yield* Capabilities.ProcessMonitor;
    const processManagerRuntime = yield* Capabilities.ProcessManagerRuntime;

    const progressSink = createProgressTraceSink(() => capabilityManager.getAll(AppCapabilities.ProgressRegistry)[0]);

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
    return [];
  }),
);
