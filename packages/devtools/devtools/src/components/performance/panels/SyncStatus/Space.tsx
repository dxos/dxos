//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';
import { type PeerSyncState, type Space, type SpaceId, SpaceState, useSpace } from '@dxos/react-client/echo';
import { mx } from '@dxos/ui-theme';

// TODO(wittjosiah): Factor out (copied from plugin-space).
export const getSpaceDisplayName = (space: Space, { personal }: { personal?: boolean } = {}): string => {
  return space.state.get() === SpaceState.SPACE_READY && (space.properties.name?.length ?? 0) > 0
    ? space.properties.name!
    : personal
      ? 'Personal Space' // TODO(burdon): From translations.
      : 'New space';
};

export type SpaceRowContainerProps = Omit<SpaceRowProps, 'spaceName'>;

export const SpaceRowContainer = ({ spaceId, state }: SpaceRowContainerProps) => {
  const client = useClient();
  const space = useSpace(spaceId);
  if (!space) {
    return null;
  }

  const spaceName = getSpaceDisplayName(space, { personal: space === client.spaces.default });

  return <SpaceRow spaceId={spaceId} spaceName={spaceName} state={state} />;
};

export type SpaceRowProps = {
  spaceId: SpaceId;
  spaceName: string;
  state: PeerSyncState;
};

export const SpaceRow = ({
  spaceId,
  spaceName,
  state: {
    localDocumentCount,
    remoteDocumentCount,
    missingOnLocal,
    missingOnRemote,
    totalDocumentCount,
    unsyncedDocumentCount,
  },
}: SpaceRowProps) => {
  const isSynced = unsyncedDocumentCount === 0;

  const tooltip = [
    `Space: ${spaceName}`,
    `SpaceId: ${spaceId}`,
    `Status: ${isSynced ? 'done' : 'syncing'}`,
    `Total documents: ${totalDocumentCount}`,
    `Unsynced documents: ${unsyncedDocumentCount}`,
    `Local documents: ${localDocumentCount} (missing: ${missingOnLocal})`,
    `Remote documents: ${remoteDocumentCount} (missing: ${missingOnRemote})`,
  ].join('\n');

  return (
    <div
      className='flex items-center mx-0.5 gap-1 cursor-pointer'
      title={tooltip}
      onClick={() => {
        void navigator.clipboard.writeText(spaceId);
      }}
    >
      <span className='is-1/2 truncate'>{spaceName}</span>
      <span className={mx('pli-1 plb-0.5 rounded text-xs shrink-0')}>
        {isSynced ? `✅ total: ${totalDocumentCount}` : `↕ syncing: ${unsyncedDocumentCount}`}
      </span>
    </div>
  );
};
