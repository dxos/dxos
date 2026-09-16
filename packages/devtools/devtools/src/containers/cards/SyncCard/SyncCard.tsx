//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { IconButton } from '@dxos/react-ui';

import { StatCard } from '../../../components/index.ts';
import { type SyncRow } from '../../../hooks/index.ts';

export type SyncCardProps = {
  spaces?: SyncRow[];
  onCopy?: () => void;
};

const describe = ({ spaceId, name, state, feedState }: SyncRow): string =>
  [
    `Space: ${name}`,
    `SpaceId: ${spaceId}`,
    `Automerge total: ${state.totalDocumentCount ?? 0}`,
    `Automerge unsynced: ${state.unsyncedDocumentCount ?? 0}`,
    `Feed total: ${feedState?.total ?? 0}`,
    `Feed pending: ${feedState?.pending ?? 0}`,
    `Local documents: ${state.localDocumentCount} (missing: ${state.missingOnLocal})`,
    `Remote documents: ${state.remoteDocumentCount} (missing: ${state.missingOnRemote})`,
  ].join('\n');

const Metric = ({ label, pending, total }: { label: string; pending: number; total: number }) => (
  <span className='inline-flex items-center gap-1'>
    <span className='text-subdued'>{label}</span>
    <span className={pending > 0 ? 'text-warning-text' : 'text-success-text'}>
      {pending > 0 ? `${pending}/${total}` : total}
    </span>
  </span>
);

export const SyncCard = ({ spaces = [], onCopy }: SyncCardProps) => {
  const pending = spaces.filter(
    ({ state, feedState }) => (state.unsyncedDocumentCount ?? 0) > 0 || (feedState?.pending ?? 0) > 0,
  ).length;

  return (
    <StatCard.Root>
      <StatCard.Header
        icon='ph--git-diff--regular'
        title='Sync'
        info={pending > 0 ? `${pending} syncing` : `${spaces.length} spaces`}
        action={
          onCopy && <IconButton iconOnly variant='ghost' icon='ph--copy--regular' label='Copy raw' onClick={onCopy} />
        }
      />
      {spaces.length === 0 && <StatCard.Row label='No spaces.' />}
      {spaces.map((row) => {
        const unsynced = row.state.unsyncedDocumentCount ?? 0;
        const feedPending = row.feedState?.pending ?? 0;
        const syncing = unsynced > 0 || feedPending > 0;
        return (
          <StatCard.Row
            key={row.spaceId}
            icon={syncing ? 'ph--arrows-down-up--regular' : 'ph--check-circle--regular'}
            iconClassNames={syncing ? 'text-warning-text' : 'text-success-text'}
            label={row.name}
            title={describe(row)}
            value={
              <span className='inline-flex gap-2'>
                <Metric label='automerge' pending={unsynced} total={row.state.totalDocumentCount ?? 0} />
                <Metric label='feed' pending={feedPending} total={row.feedState?.total ?? 0} />
              </span>
            }
            action={
              <IconButton
                iconOnly
                variant='ghost'
                icon='ph--copy--regular'
                label='Copy space id'
                onClick={() => void navigator.clipboard.writeText(row.spaceId)}
              />
            }
          />
        );
      })}
    </StatCard.Root>
  );
};

SyncCard.displayName = 'SyncCard';
