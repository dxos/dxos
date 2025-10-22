//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type PeerSyncState, type SpaceId, type SpaceSyncStateMap } from '@dxos/react-client/echo';
import { IconButton, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { SpaceRowContainer } from './Space';

export type SyncStatusProps = ThemedClassName<{
  state: SpaceSyncStateMap;
  summary: PeerSyncState;
  debug?: boolean;
}>;

export const SyncStatus = ({ classNames, state }: SyncStatusProps) => {
  const entries = Object.entries(state);

  const handleCopyRaw = () => {
    void navigator.clipboard.writeText(JSON.stringify(state, null, 2));
  };

  return (
    <div className={mx('flex flex-col is-full gap-2 text-xs', classNames)}>
      <div className='flex items-center gap-2'>
        <IconButton icon='ph--copy--regular' label={'copy raw'} onClick={handleCopyRaw} />
      </div>
      <div>
        {entries.map(([spaceId, state]) => (
          <SpaceRowContainer key={spaceId} spaceId={spaceId as SpaceId} state={state} />
        ))}
      </div>
    </div>
  );
};
