//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type PublicKey } from '@dxos/client';
import { type Space, SpaceState, type SpaceSyncState } from '@dxos/client/echo';
import { truncateKey } from '@dxos/debug';

// TODO(wittjosiah): Factor out.
const maybeTruncateKey = (key: PublicKey, truncate = false) => (truncate ? truncateKey(key) : key.toHex());

// TODO(wittjosiah): Use @effect/printer.
export const formatSpace = Effect.fn(function* (space: Space, options = { verbose: false, truncateKeys: false }) {
  yield* Effect.tryPromise(() => space.waitUntilReady());

  // TODO(burdon): Factor out.
  // TODO(burdon): Agent needs to restart before `ready` is available.
  const { open, ready } = space.internal.data.metrics ?? {};
  const startup = open && ready && ready.getTime() - open.getTime();

  // TODO(burdon): Get feeds from client-services if verbose (factor out from devtools/diagnostics).
  // const host = client.services.services.DevtoolsHost!;
  const pipeline = space.internal.data.pipeline;
  const epoch = pipeline?.currentEpoch?.subject.assertion.number;

  const syncState = aggregateSyncState(yield* Effect.tryPromise(() => space.db.coreDatabase.getSyncState()));

  return {
    id: space.id,
    state: SpaceState[space.state.get()],
    name: space.state.get() === SpaceState.SPACE_READY ? space.properties.name : 'loading...',

    members: space.members.get().length,
    objects: space.db.coreDatabase.getAllObjectIds().length,

    key: maybeTruncateKey(space.key, options.truncateKeys),
    epoch,
    startup,
    automergeRoot: space.internal.data.pipeline?.spaceRootUrl,
    // appliedEpoch,
    syncState: `${syncState.count} ${getSyncIndicator(syncState.up, syncState.down)} (${syncState.peers} peers)`,
  };
});

const aggregateSyncState = (syncState: SpaceSyncState) => {
  const peers = Object.keys(syncState.peers ?? {}).length;
  const missingOnLocal = Math.max(...Object.values(syncState.peers ?? {}).map((peer) => peer.missingOnLocal), 0);
  const missingOnRemote = Math.max(...Object.values(syncState.peers ?? {}).map((peer) => peer.missingOnRemote), 0);
  const differentDocuments = Math.max(
    ...Object.values(syncState.peers ?? {}).map((peer) => peer.differentDocuments),
    0,
  );

  return {
    count: missingOnLocal + missingOnRemote + differentDocuments,
    peers,
    up: missingOnRemote > 0 || differentDocuments > 0,
    down: missingOnLocal > 0 || differentDocuments > 0,
  };
};

const getSyncIndicator = (up: boolean, down: boolean) => {
  if (up) {
    if (down) {
      return '⇅';
    } else {
      return '↑';
    }
  } else {
    if (down) {
      return '↓';
    } else {
      return '✓';
    }
  }
};
