//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SpaceId } from '@dxos/keys';
import { type FeedSyncState, type PeerSyncState, type Space, SpaceState, useSpace } from '@dxos/react-client/echo';
import { Icon } from '@dxos/react-ui';
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

export const SpaceRowContainer = ({ spaceId, state, feedState }: SpaceRowContainerProps) => {
  const space = useSpace(spaceId);
  if (!space) {
    return null;
  }

  const spaceName = getSpaceDisplayName(space);

  return <SpaceRow spaceId={spaceId} spaceName={spaceName} state={state} feedState={feedState} />;
};

export type SpaceRowProps = {
  spaceId: SpaceId;
  spaceName: string;
  state: PeerSyncState;
  feedState?: FeedSyncState;
};

const SyncMetric = ({
  label,
  synced,
  count,
}: {
  label: string;
  synced: boolean;
  count: number;
}) => (
  <span className='inline-flex items-center gap-1 min-w-0'>
    <span className='text-subdued'>{label}:</span>
    <Icon
      icon={synced ? 'ph--check-circle--regular' : 'ph--arrows-down-up--regular'}
      classNames={mx('shrink-0', synced ? 'text-success-text' : 'text-warning-text')}
    />
    <span className='tabular-nums'>{count}</span>
  </span>
);

export const SpaceRow = ({
  spaceId,
  spaceName,
  feedState = { pending: 0, total: 0 },
  state: {
    localDocumentCount,
    remoteDocumentCount,
    missingOnLocal,
    missingOnRemote,
    totalDocumentCount,
    unsyncedDocumentCount,
  },
}: SpaceRowProps) => {
  const automergeUnsynced = unsyncedDocumentCount ?? 0;
  const automergeTotal = totalDocumentCount ?? 0;
  const automergeSynced = automergeUnsynced === 0;

  const feedPending = feedState.pending;
  const feedTotal = feedState.total;
  const feedSynced = feedPending === 0;

  const tooltip = [
    `Space: ${spaceName}`,
    `SpaceId: ${spaceId}`,
    `Automerge total: ${automergeTotal}`,
    `Automerge unsynced: ${automergeUnsynced}`,
    `Feed total: ${feedTotal}`,
    `Feed pending: ${feedPending}`,
    `Local documents: ${localDocumentCount} (missing: ${missingOnLocal})`,
    `Remote documents: ${remoteDocumentCount} (missing: ${missingOnRemote})`,
  ].join('\n');

  return (
    <div
      className='flex flex-col gap-0.5 py-1 mx-0.5 cursor-pointer min-w-0'
      title={tooltip}
      onClick={() => {
        void navigator.clipboard.writeText(spaceId);
      }}
    >
      <div className='truncate font-medium'>{spaceName}</div>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-0.5'>
        <SyncMetric
          label='automerge'
          synced={automergeSynced}
          count={automergeSynced ? automergeTotal : automergeUnsynced}
        />
        <SyncMetric label='feed' synced={feedSynced} count={feedSynced ? feedTotal : feedPending} />
      </div>
    </div>
  );
};
