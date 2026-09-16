//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Grid, IconButton, SystemIconButton, Tooltip } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { StatCard } from '../../../components/index.ts';
import { type SyncRow } from '../../../hooks/index.ts';

export type SyncCardProps = {
  spaces?: SyncRow[];
  onCopy?: () => void;
};

/**
 * The chip track is `max-content`, not `auto`: the button clips its overflow, which zeroes a grid
 * item's automatic minimum, so an `auto` track could shrink under it and let it run into the next
 * column. The two figure tracks share the rest, named by the header row rather than per cell so a
 * narrow card still fits.
 */
const ROW_TRACKS = ['max-content', '1fr', '1fr'];

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
        hue='green'
        title='Sync'
        info={pending > 0 ? `${pending} syncing` : `${spaces.length} spaces`}
        action={
          onCopy && <IconButton iconOnly variant='ghost' icon='ph--copy--regular' label='Copy raw' onClick={onCopy} />
        }
      />
      {spaces.length === 0 && <StatCard.Row label='No spaces.' />}
      {spaces.length > 0 && (
        <StatCard.Row>
          <Grid cols={ROW_TRACKS} gap='sm' classNames='text-end text-subdued'>
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
