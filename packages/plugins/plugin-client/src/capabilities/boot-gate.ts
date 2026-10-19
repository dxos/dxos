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

export const MAJOR_REINDEX_THRESHOLD = 500;

export const BOOT_GATE_FIRST_STATUS_BUDGET = 5_000;

export const BOOT_GATE_STALL_BUDGET = 60_000;

const RELEASED: Capabilities.BootGateState = { pending: false };

const UPDATING = 'Updating database';

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

export const followIndexStatus = (
  indexStatus: MulticastObservable<DataService.IndexStatus | null>,
  set: (state: Capabilities.BootGateState) => void,
): (() => void) => {
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const update = (next: Capabilities.BootGateState) => {
    clearTimeout(deadline);
    set(next);
    if (next.pending) {
      deadline = setTimeout(() => update(RELEASED), BOOT_GATE_STALL_BUDGET);
    } else {
      subscription.unsubscribe();
    }
  };

  deadline = setTimeout(() => update(RELEASED), BOOT_GATE_FIRST_STATUS_BUDGET);
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
