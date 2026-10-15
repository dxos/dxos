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

/** Each kind of index work the meter shows, read from a status. */
const LANES: readonly {
  key: string;
  label: (status: DataService.IndexStatus) => string;
  progress: (status: DataService.IndexStatus) => DataService.IndexProgress | undefined;
}[] = [
  {
    key: INDEX_PROGRESS_KEY,
    label: (status) => (status.phase === 'migrating' ? 'Migrating database' : 'Updating database index'),
    progress: (status) => (status.phase === 'idle' ? undefined : status),
  },
  {
    key: `${INDEX_PROGRESS_KEY}.catch-up`,
    label: () => 'Catching up database index',
    progress: (status) => status.catchUp,
  },
  {
    key: `${INDEX_PROGRESS_KEY}.full-text`,
    label: () => 'Updating search index',
    progress: (status) => status.fullText,
  },
];

/**
 * Mirrors one kind of index work into a progress monitor while it lasts longer than
 * {@link INDEX_PROGRESS_DEBOUNCE}, removing it once that work ends.
 */
const followLane = (registry: Pick<AppCapabilities.ProgressRegistry, 'register'>, key: string) => {
  let latest: { label: string; progress: DataService.IndexProgress } | undefined;
  let monitor: AppCapabilities.ProgressMonitor | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const show = ({ label, progress }: { label: string; progress: DataService.IndexProgress }) => {
    monitor ??= registry.register(key, { label });
    monitor.total(progress.total > 0 ? progress.total : undefined);
    monitor.set(progress.done);
  };

  const hide = () => {
    clearTimeout(debounce);
    debounce = undefined;
    monitor?.remove();
    monitor = undefined;
  };

  const update = (label: string, progress: DataService.IndexProgress | undefined) => {
    latest = progress && { label, progress };
    if (!latest) {
      hide();
    } else if (monitor) {
      show(latest);
    } else {
      debounce ??= setTimeout(() => {
        debounce = undefined;
        if (latest) {
          show(latest);
        }
      }, INDEX_PROGRESS_DEBOUNCE);
    }
  };

  return { update, hide };
};

/**
 * Mirrors the client's index status into the progress registry, one monitor per kind of index work
 * that lasts longer than {@link INDEX_PROGRESS_DEBOUNCE}. Returns a cleanup.
 */
export const followIndexProgress = (
  indexStatus: MulticastObservable<DataService.IndexStatus | null>,
  registry: Pick<AppCapabilities.ProgressRegistry, 'register'>,
): (() => void) => {
  const lanes = LANES.map((lane) => ({ ...lane, ...followLane(registry, lane.key) }));
  const subscription = indexStatus.subscribe((status) => {
    for (const lane of lanes) {
      if (status) {
        lane.update(lane.label(status), lane.progress(status));
      } else {
        lane.hide();
      }
    }
  });

  return () => {
    subscription.unsubscribe();
    for (const lane of lanes) {
      lane.hide();
    }
  };
};

/**
 * Shows index work in the status bar's progress meter: migrations and rebuilds, including the ones
 * the boot screen waits out, catch-up, and full-text rebuilds.
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
