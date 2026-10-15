//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { type MulticastObservable } from '@dxos/async';
import { type DataService } from '@dxos/protocols/rpc';

import { ClientCapabilities } from '#types';

/** A rebuild of at least this many documents and feed blocks holds the boot loader; a smaller one finishes about as fast as the app opens. */
export const MAJOR_REINDEX_THRESHOLD = 500;

/** How long the gate waits for the worker's first index status before letting the app open anyway. */
export const BOOT_GATE_BUDGET = 5_000;

/** How long a holding gate waits between statuses before letting the app open anyway; a rebuild reports about once a second. */
export const BOOT_GATE_STALL_BUDGET = 60_000;

const RELEASED: Capabilities.BootGateState = { pending: false };

const UPDATING = 'Updating database';

/**
 * The gate's next state for an index status, while it still holds the loader: hold through
 * migrations and a major rebuild, and release for anything else. The gate stops consulting this once
 * released, since a dismissed loader does not come back.
 */
export const gateStateFor = (status: DataService.IndexStatus): Capabilities.BootGateState => {
  const progress = status.total > 0 ? status.done / status.total : undefined;
  switch (status.phase) {
    case 'migrating':
      return { pending: true, status: UPDATING, progress };
    case 'indexing':
      return status.total >= MAJOR_REINDEX_THRESHOLD
        ? { pending: true, status: UPDATING, count: { done: status.done, total: status.total }, progress }
        : RELEASED;
    case 'idle':
      return RELEASED;
  }
};

/**
 * Drives a boot gate from the client's index status until it releases: the first status (or
 * {@link BOOT_GATE_BUDGET}) decides, and a gate left holding without a status for
 * {@link BOOT_GATE_STALL_BUDGET} releases. Returns a cleanup.
 */
export const followIndexStatus = (
  indexStatus: MulticastObservable<DataService.IndexStatus | null>,
  set: (state: Capabilities.BootGateState) => void,
): (() => void) => {
  let released = false;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const update = (next: Capabilities.BootGateState) => {
    if (released) {
      return;
    }
    clearTimeout(deadline);
    set(next);
    // Later statuses are ignored rather than unsubscribed here: the observable can emit during `subscribe`.
    released = !next.pending;
    if (!released) {
      deadline = setTimeout(() => update(RELEASED), BOOT_GATE_STALL_BUDGET);
    }
  };

  deadline = setTimeout(() => update(RELEASED), BOOT_GATE_BUDGET);
  const subscription = indexStatus.subscribe((status) => {
    if (status) {
      update(gateStateFor(status));
    }
  });
  return () => {
    clearTimeout(deadline);
    subscription.unsubscribe();
  };
};

/**
 * Holds the boot loader while the client's worker migrates or rebuilds a large index after an
 * upgrade, when the app would open with no data. Contributed at `Startup`, closed, so it is in place
 * before the loader can dismiss.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const registry = yield* Capabilities.AtomRegistry;

    const state = Atom.make<Capabilities.BootGateState>({ pending: true }).pipe(Atom.keepAlive);
    const cleanup = followIndexStatus(client.indexStatus, (next) => registry.set(state, next));
    yield* Effect.addFinalizer(() => Effect.sync(cleanup));

    return Capability.contribute(Capabilities.BootGate, { id: 'org.dxos.plugin.client.index', state });
  }),
);
