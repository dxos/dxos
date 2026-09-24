//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { type SpaceId } from '@dxos/keys';
import {
  type FeedSyncState,
  type PeerSyncState,
  type Space,
  SpaceState,
  useFeedSyncState,
  useSpaces,
  useSyncState,
} from '@dxos/react-client/echo';

export type SyncRow = {
  spaceId: string;
  name: string;
  state: PeerSyncState;
  feedState?: FeedSyncState;
};

// TODO(wittjosiah): Factor out (copied from plugin-space).
const getSpaceDisplayName = (space: Space): string => {
  const name = space.state.get() === SpaceState.SPACE_READY ? space.properties.name : undefined;
  return name && name.length > 0 ? name : 'New space';
};

/** One sync row per space the client knows, named for display, plus a raw-state copy action. */
export const useSyncRows = (): { spaces: SyncRow[]; copy: () => void } => {
  const state = useSyncState();
  const feedState = useFeedSyncState();
  const spaces = useSpaces({ all: true });
  const rows = useMemo(
    () =>
      Object.entries(state).flatMap(([spaceId, peerState]) => {
        const space = spaces.find((space) => space.id === spaceId);
        if (!space) {
          return [];
        }
        return [
          { spaceId, name: getSpaceDisplayName(space), state: peerState, feedState: feedState[spaceId as SpaceId] },
        ];
      }),
    [state, feedState, spaces],
  );

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify({ automerge: state, feed: feedState }, null, 2));
  }, [state, feedState]);

  return { spaces: rows, copy };
};
