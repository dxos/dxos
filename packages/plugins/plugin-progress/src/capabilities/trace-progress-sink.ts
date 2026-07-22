//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, createProgressTraceSink } from '@dxos/app-toolkit';
import { Process } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';

/**
 * Contributes a {@link Capabilities.TraceSink} that projects `status.update` trace events into the
 * {@link AppCapabilities.ProgressRegistry}. Runs in parallel with the feed trace sink contributed by
 * `plugin-routine` — both are merged by the process-manager runtime.
 *
 * {@link AppCapabilities.ProgressRegistry} is resolved lazily on each write rather than required
 * upfront, since the factory itself has no dependencies. Process-manager runtime is likewise
 * resolved lazily on cancel.
 */
export default Capability.inlineModule(
  'TraceProgressSink',
  { provides: [Capabilities.TraceSink] },
  Effect.fnUntraced(function* () {
    const capabilityManager = yield* Capability.Service;
    const runtime = yield* Effect.runtime<Capability.Service>();

    const terminateProcess = (pid: string) =>
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

    return [
      Capability.contribute(Capabilities.TraceSink, () =>
        createProgressTraceSink(() => capabilityManager.getAll(AppCapabilities.ProgressRegistry)[0], {
          terminateProcess,
        }),
      ),
    ];
  }),
);
