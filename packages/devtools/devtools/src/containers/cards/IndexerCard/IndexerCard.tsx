//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Grid, SystemIconButton, Tooltip } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';
import { type IndexerRow } from '../../../hooks/index.ts';

export type IndexerCardProps = {
  spaces?: IndexerRow[];
  onRefresh?: () => void;
  onCopy?: () => void;
};

/** Fixed figure tracks so the header and every row's grid resolve to the same columns (see `SyncCard`). */
const ROW_TRACKS = ['1fr', '4.5rem', '4rem'];

const rowIcon = (row: IndexerRow): { icon: string; className: string } => {
  if (row.error) {
    return { icon: 'ph--warning-circle--regular', className: 'text-error-text' };
  }
  if (row.unindexed > 0 || row.indexingInProgress) {
    return { icon: 'ph--arrows-clockwise--regular', className: 'text-warning-text' };
  }
  return { icon: 'ph--check-circle--regular', className: 'text-success-text' };
};

/** Per space, how many of the client's documents the EDGE indexer has indexed at the client's heads. */
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
      {spaces.length > 0 && (
        <StatCard.Row>
          <Grid cols={ROW_TRACKS} gap='sm' classNames='text-end text-description'>
            <span className='text-start'>space</span>
            <span>client</span>
            <span>edge</span>
          </Grid>
        </StatCard.Row>
      )}
      {spaces.map((row) => {
        const { icon, className } = rowIcon(row);
        return (
          <StatCard.Row key={row.spaceId} icon={icon} iconClassNames={className}>
            <Grid cols={ROW_TRACKS} gap='sm' align='center' classNames='text-end'>
              <Tooltip.Trigger asChild content={row.error ?? row.name}>
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
              {row.error ? (
                <span className='col-span-2 text-error-text'>error</span>
              ) : (
                <>
                  <span
                    className={mx(
                      'font-mono tabular-nums',
                      row.unindexed > 0 ? 'text-warning-text' : 'text-success-text',
                    )}
                  >
                    {row.unindexed > 0 ? `${row.unindexed}/${row.total}` : row.total}
                  </span>
                  <span className='font-mono tabular-nums text-description'>{row.indexed}</span>
                </>
              )}
            </Grid>
          </StatCard.Row>
        );
      })}
    </StatCard.Root>
  );
};

IndexerCard.displayName = 'IndexerCard';
