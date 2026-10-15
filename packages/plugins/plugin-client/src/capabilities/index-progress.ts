//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { type MulticastObservable } from '@dxos/async';
import { type DataService } from '@dxos/protocols/rpc';

import { ClientCapabilities } from '#types';

/** Index work that ends sooner than this never reaches the meter, so a quick pass does not flash it. */
export const INDEX_PROGRESS_DEBOUNCE = 1_000;

const INDEX_PROGRESS_KEY = 'org.dxos.plugin.client.index';

const labelFor = (phase: DataService.IndexStatus['phase']) =>
  phase === 'migrating' ? 'Migrating database' : 'Updating database index';

/**
 * Mirrors the client's index status into a progress monitor while index work lasts longer than
 * {@link INDEX_PROGRESS_DEBOUNCE}, removing it once the index is idle. Returns a cleanup.
 */
export const followIndexProgress = (
  indexStatus: MulticastObservable<DataService.IndexStatus | null>,
  registry: Pick<AppCapabilities.ProgressRegistry, 'register'>,
): (() => void) => {
  let latest: DataService.IndexStatus | null = null;
  let monitor: AppCapabilities.ProgressMonitor | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const show = (status: DataService.IndexStatus) => {
    monitor ??= registry.register(INDEX_PROGRESS_KEY, { label: labelFor(status.phase) });
    monitor.total(status.total > 0 ? status.total : undefined);
    monitor.set(status.done);
  };

  const hide = () => {
    clearTimeout(debounce);
    debounce = undefined;
    monitor?.remove();
    monitor = undefined;
  };

  const subscription = indexStatus.subscribe((status) => {
    latest = status;
    if (!status || status.phase === 'idle') {
      hide();
    } else if (monitor) {
      show(status);
    } else {
      debounce ??= setTimeout(() => {
        debounce = undefined;
        if (latest && latest.phase !== 'idle') {
          show(latest);
        }
      }, INDEX_PROGRESS_DEBOUNCE);
    }
  });

  return () => {
    subscription.unsubscribe();
    hide();
  };
};

/**
 * Shows index migrations and rebuilds in the status bar's progress meter: the ones the boot screen
 * waits out, and smaller ones it lets the app open over.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    // Optional: a host without a progress registry loses the meter, not the plugin.
    const registry = yield* Capability.getOption(AppCapabilities.ProgressRegistry);
    if (Option.isNone(registry)) {
      return [];
    }

    const cleanup = followIndexProgress(client.indexStatus, registry.value);
    yield* Effect.addFinalizer(() => Effect.sync(cleanup));
    return [];
  }),
);
