//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SpaceId } from '@dxos/keys';
import { type FeedSyncState, type PeerSyncState, type Space, SpaceState, useSpace } from '@dxos/react-client/echo';
import { Icon } from '@dxos/react-ui';

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

const SyncMetric = ({ label, pending, total }: { label: string; pending: number; total: number }) => {
  const syncing = pending > 0;

  return (
    <span className='inline-flex items-center gap-x-1.5 min-w-0'>
      <span className='text-subdued shrink-0'>{label}</span>
      {syncing ? (
        <span className='inline-flex items-center gap-0.5 text-warning-text'>
          <Icon icon='ph--arrows-down-up--regular' classNames='shrink-0' />
          <span className='tabular-nums'>{pending}</span>
          <span className='text-subdued'>syncing…</span>
        </span>
      ) : (
        <span className='inline-flex items-center gap-0.5 text-success-text'>
          <Icon icon='ph--check-circle--regular' classNames='shrink-0' />
          <span className='tabular-nums'>{total}</span>
          <span className='text-subdued'>total</span>
        </span>
      )}
    </span>
  );
};

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

  const feedPending = feedState.pending;
  const feedTotal = feedState.total;

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
      className='flex flex-col gap-1 py-1 mx-0.5 cursor-pointer min-w-0'
      title={tooltip}
      onClick={() => {
        void navigator.clipboard.writeText(spaceId);
      }}
    >
      <div className='truncate font-medium'>{spaceName}</div>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs'>
        <SyncMetric label='automerge' pending={automergeUnsynced} total={automergeTotal} />
        <SyncMetric label='feed' pending={feedPending} total={feedTotal} />
      </div>
    </div>
  );
};
