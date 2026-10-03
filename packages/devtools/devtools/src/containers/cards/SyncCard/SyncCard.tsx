//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Grid, IconButton, SystemIconButton, Tooltip } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';
import { type SyncRow } from '../../../hooks/index.ts';

export type SyncCardProps = {
  spaces?: SyncRow[];
  onCopy?: () => void;
};

/**
 * Fixed figure tracks: every row is its own grid, so a content-sized track would resolve
 * differently under the header's label and the data rows' chips and the columns would drift.
 * The chip track takes the slack; the figures are sized for `pending/total`.
 */
const ROW_TRACKS = ['1fr', '4.5rem', '4rem'];

const Metric = ({ pending, total }: { pending: number; total: number }) => (
  <span className={mx('font-mono tabular-nums', pending > 0 ? 'text-warning-text' : 'text-success-text')}>
    {pending > 0 ? `${pending}/${total}` : total}
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
        hue={STAT_CARD_HUES.database}
        title='Sync'
        info={pending > 0 ? `${pending} syncing` : `${spaces.length} spaces`}
        action={
          onCopy && <IconButton iconOnly variant='ghost' icon='ph--copy--regular' label='Copy raw' onClick={onCopy} />
        }
      />
      {spaces.length === 0 && <StatCard.Row span label='No spaces.' />}
      {spaces.length > 0 && (
        <StatCard.Row>
          <Grid cols={ROW_TRACKS} gap='sm' classNames='text-end text-description'>
            <span className='text-start'>space</span>
            <span>automerge</span>
            <span>feed</span>
          </Grid>
        </StatCard.Row>
      )}
      {spaces.map((row) => {
        const unsynced = row.state.unsyncedDocumentCount ?? 0;
        const feedPending = row.feedState?.pending ?? 0;
        const syncing = unsynced > 0 || feedPending > 0;
        return (
          <StatCard.Row
            key={row.spaceId}
            icon={syncing ? 'ph--arrows-down-up--regular' : 'ph--check-circle--regular'}
            iconClassNames={syncing ? 'text-warning-text' : 'text-success-text'}
          >
            <Grid cols={ROW_TRACKS} gap='sm' align='center' classNames='text-end'>
              <Tooltip.Trigger asChild content={row.name}>
                <SystemIconButton.Clipboard
                  density='sm'
                  variant='ghost'
                  compact
                  iconEnd
                  classNames='justify-self-start font-mono'
                  label={row.spaceId.slice(0, 8)}
                  onCopy={() => row.spaceId}
                />
              </Tooltip.Trigger>
              <Metric pending={unsynced} total={row.state.totalDocumentCount ?? 0} />
              <Metric pending={feedPending} total={row.feedState?.total ?? 0} />
            </Grid>
          </StatCard.Row>
        );
      })}
    </StatCard.Root>
  );
};

SyncCard.displayName = 'SyncCard';
