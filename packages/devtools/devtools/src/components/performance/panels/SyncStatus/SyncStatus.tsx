//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SpaceId } from '@dxos/keys';
import { type FeedSyncStateMap, type PeerSyncState, type SpaceSyncStateMap } from '@dxos/react-client/echo';
import { type ThemedClassName, IconButton } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { SpaceRowContainer } from './Space';

export type SyncStatusProps = ThemedClassName<{
  state: SpaceSyncStateMap;
  summary: PeerSyncState;
  feedState?: FeedSyncStateMap;
  debug?: boolean;
}>;

export const SyncStatus = ({ classNames, state, feedState }: SyncStatusProps) => {
  const entries = Object.entries(state);

  const handleCopyRaw = () => {
    void navigator.clipboard.writeText(JSON.stringify({ automerge: state, feed: feedState }, null, 2));
  };

  return (
    <div className={mx('flex flex-col w-full gap-2 text-xs', classNames)}>
      <div className='flex items-center gap-2'>
        <IconButton icon='ph--copy--regular' label={'copy raw'} onClick={handleCopyRaw} />
      </div>
      <div className='flex flex-col divide-y divide-separator'>
        {entries.map(([spaceId, state]) => (
          <SpaceRowContainer
            key={spaceId}
            spaceId={spaceId as SpaceId}
            state={state}
            feedState={feedState?.[spaceId as SpaceId]}
          />
        ))}
      </div>
    </div>
  );
};
