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
 * Activation mirrors `plugin-client`'s space replication progress: gate on
 * {@link AppActivationEvents.ProgressRegistryReady} so {@link Capability.get} is safe. Process-manager
 * runtime is resolved lazily on cancel — it is contributed only after this module's sink is collected.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const progressRegistry = yield* Capability.get(AppCapabilities.ProgressRegistry);
    const processManagerRuntime = yield* Capability.get(Capabilities.ProcessManagerRuntime);

    const terminateProcess = (pid: string) => {
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
    };

    return Capability.contributes(Capabilities.TraceSink, () =>
      createProgressTraceSink(progressRegistry, { terminateProcess }),
    );
  }),
);
