//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Grid } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';
import { type IndexerRow } from '../../../hooks/index.ts';

export type IndexerCardProps = {
  spaces?: IndexerRow[];
  onRefresh?: () => void;
  onCopy?: () => void;
};

const ROW_TRACKS = ['1fr', 'auto'];

const rowIcon = (row: IndexerRow): { icon: string; className: string } => {
  if (row.error) {
    return { icon: 'ph--warning-circle--regular', className: 'text-error-text' };
  }
  if (row.unindexed > 0) {
    return { icon: 'ph--arrows-clockwise--regular', className: 'text-warning-text' };
  }
  return { icon: 'ph--check-circle--regular', className: 'text-success-text' };
};

const rowStatus = (row: IndexerRow): string =>
  row.error ? 'error' : row.unindexed > 0 ? `${row.unindexed} behind` : 'up to date';

/** Per space, how many of the client's documents the EDGE indexer has yet to index at the client's heads. */
export const IndexerCard = ({ spaces = [], onRefresh, onCopy }: IndexerCardProps) => {
  const behind = spaces.filter(({ unindexed, error }) => !error && unindexed > 0).length;
  const menu = [
    ...(onRefresh ? [{ label: 'Refresh', icon: 'ph--arrow-clockwise--regular', onClick: onRefresh }] : []),
    ...(onCopy ? [{ label: 'Copy raw', icon: 'ph--copy--regular', onClick: onCopy }] : []),
  ];

  return (
    <StatCard.Root>
      <StatCard.Header
        icon='ph--magnifying-glass--regular'
        hue={STAT_CARD_HUES.edge}
        title='Indexer'
        info={behind > 0 ? `${behind} behind` : `${spaces.length} spaces`}
        menu={menu.length > 0 ? menu : undefined}
      />
      {spaces.length === 0 && <StatCard.Row span label='No spaces.' />}
      {spaces.map((row) => {
        const { icon, className } = rowIcon(row);
        return (
          <StatCard.Row key={row.spaceId} icon={icon} iconClassNames={className}>
            <Grid cols={ROW_TRACKS} gap='sm' align='center' classNames='text-end'>
              <Next.Tooltip.Trigger asChild content={row.error ?? row.name}>
                <Next.SystemButton.Clipboard
                  size='sm'
                  variant='ghost'
                  compact
                  classNames='justify-self-start font-mono'
                  label={row.spaceId.slice(0, 8)}
                  onCopy={() => row.spaceId}
                />
              </Next.Tooltip.Trigger>
              <span className={className}>{rowStatus(row)}</span>
            </Grid>
          </StatCard.Row>
        );
      })}
    </StatCard.Root>
  );
};

IndexerCard.displayName = 'IndexerCard';
