//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Grid, IconButton } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

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

/** The name takes the slack; fixed figure tracks line the automerge and feed columns up across rows. */
const ROW_TRACKS = ['1fr', 'auto', '5rem', 'auto', '3.5rem'];

const Metric = ({ label, pending, total }: { label: string; pending: number; total: number }) => (
  <>
    <span className='text-subdued'>{label}</span>
    <span className={mx('font-mono tabular-nums', pending > 0 ? 'text-warning-text' : 'text-success-text')}>
      {pending > 0 ? `${pending}/${total}` : total}
    </span>
  </>
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
            // TODO(burdon): Use system.
            action={
              <IconButton
                variant='ghost'
                density='sm'
                icon='ph--copy--regular'
                iconOnly
                label='Copy space id'
                onClick={() => void navigator.clipboard.writeText(row.spaceId)}
              />
            }
          >
            <Grid cols={ROW_TRACKS} gap='sm' align='center' classNames='text-end'>
              <span className='truncate text-start' title={describe(row)}>
                {row.name}
              </span>
              <Metric label='automerge' pending={unsynced} total={row.state.totalDocumentCount ?? 0} />
              <Metric label='feed' pending={feedPending} total={row.feedState?.total ?? 0} />
            </Grid>
          </StatCard.Row>
        );
      })}
    </StatCard.Root>
  );
};

SyncCard.displayName = 'SyncCard';
