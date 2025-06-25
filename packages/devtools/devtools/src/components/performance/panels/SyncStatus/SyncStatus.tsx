//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type PeerSyncState, type SpaceSyncStateMap, type SpaceId } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { SpaceRowContainer } from './Space';

export type SyncStatusProps = ThemedClassName<{
  state: SpaceSyncStateMap;
  summary: PeerSyncState;
  debug?: boolean;
}>;

// TODO(wittjosiah): This currently does not show `differentDocuments` at all.
export const SyncStatus = ({ classNames, state, summary, debug }: SyncStatusProps) => {
  const entries = Object.entries(state);

  // TODO(burdon): Normalize to max document count?
  return (
    <div className={mx('flex flex-col w-full gap-2 text-xs', classNames)}>
      {debug && <SyntaxHighlighter language='json'>{JSON.stringify(summary, null, 2)}</SyntaxHighlighter>}
      <div className='flex flex-col mbe-2'>
        {entries.map(([spaceId, state]) => (
          <SpaceRowContainer key={spaceId} spaceId={spaceId as SpaceId} state={state} />
        ))}
      </div>
    </div>
  );
};
