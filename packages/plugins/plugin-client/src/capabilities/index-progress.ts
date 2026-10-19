//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { type Client } from '@dxos/client';
import { type DataService } from '@dxos/protocols/rpc';

import { ClientCapabilities } from '#types';

export const INDEX_PROGRESS_DEBOUNCE = 1_000;

const INDEX_PROGRESS_KEY = 'org.dxos.plugin.client.index';

const ACTIVITY_LANES: readonly { lane: keyof DataService.IndexActivity; label: string }[] = [
  { lane: 'catchUp', label: 'Catching up database index' },
  { lane: 'fullText', label: 'Updating search index' },
];

const followLane = (registry: Pick<AppCapabilities.ProgressRegistry, 'register'>, key: string) => {
  let latest: { label: string; progress: DataService.IndexProgress } | undefined;
  let monitor: { label: string; handle: AppCapabilities.ProgressMonitor } | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const show = ({ label, progress }: { label: string; progress: DataService.IndexProgress }) => {
    if (monitor?.label !== label) {
      monitor = { label, handle: registry.register(key, { label }) };
    }
    monitor.handle.total(progress.total > 0 ? progress.total : undefined);
    monitor.handle.set(progress.done);
  };

  const hide = () => {
    clearTimeout(debounce);
    debounce = undefined;
    monitor?.handle.remove();
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

export const followIndexProgress = (
  { indexStatus, indexActivity }: Pick<Client, 'indexStatus' | 'indexActivity'>,
  registry: Pick<AppCapabilities.ProgressRegistry, 'register'>,
): (() => void) => {
  const rebuild = followLane(registry, INDEX_PROGRESS_KEY);
  const lanes = ACTIVITY_LANES.map(({ lane, label }) => ({
    lane,
    label,
    ...followLane(registry, `${INDEX_PROGRESS_KEY}.${lane}`),
  }));
  const statusSubscription = indexStatus.subscribe((status) =>
    rebuild.update(
      status?.phase === 'migrating' ? 'Migrating database' : 'Updating database index',
      status && status.phase !== 'idle' ? { done: status.done, total: status.total } : undefined,
    ),
  );
  const activitySubscription = indexActivity.subscribe((activity) => {
    for (const { lane, label, update } of lanes) {
      update(label, activity[lane]);
    }
  });

  return () => {
    statusSubscription.unsubscribe();
    activitySubscription.unsubscribe();
    rebuild.hide();
    for (const lane of lanes) {
      lane.hide();
    }
  };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const registry = yield* Capability.getOption(AppCapabilities.ProgressRegistry);
    if (Option.isNone(registry)) {
      return [];
    }

    const cleanup = followIndexProgress(client, registry.value);
    yield* Effect.addFinalizer(() => Effect.sync(cleanup));
    return [];
  }),
);
