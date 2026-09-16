//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Grid } from '@dxos/react-ui';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';
import { type DatabaseInfo } from '../../../hooks/index.ts';
import { Unit } from '../util.tsx';

export type ReplicatorMessagesCardProps = {
  database?: DatabaseInfo;
};

type MessageRow = { type: string; sent: number; received: number; size?: number };

/** Type takes the slack; fixed size, received and sent tracks make the rows a table. */
const ROW_TRACKS = ['1fr', '4rem', '3.5rem', '3.5rem'];

export const ReplicatorMessagesCard = ({ database }: ReplicatorMessagesCardProps) => {
  const replicator = database?.dataStats?.replicator;
  const rows: MessageRow[] = Object.entries(replicator?.countByMessage ?? {})
    .map(([type, counts]) => ({ type, ...counts, size: replicator?.avgSizeByMessage[type] }))
    .sort((a, b) => a.type.localeCompare(b.type));
  const sent = rows.reduce((acc, row) => acc + row.sent, 0);
  const received = rows.reduce((acc, row) => acc + row.received, 0);

  return (
    <StatCard.Root>
      <StatCard.Header
        icon='ph--envelope--regular'
        hue={STAT_CARD_HUES.database}
        title='Messages'
        info={`${received}↓ ${sent}↑`}
      />
      {rows.length === 0 && <StatCard.Row span label='No messages.' />}
      {rows.length > 0 && (
        <StatCard.Row>
          <Grid cols={ROW_TRACKS} gap='sm' classNames='text-end text-subdued'>
            <span className='text-start'>type</span>
            <span>KB</span>
            <span>↓</span>
            <span>↑</span>
          </Grid>
        </StatCard.Row>
      )}
      {rows.map((row) => (
        <StatCard.Row key={row.type}>
          <Grid cols={ROW_TRACKS} gap='sm' classNames='font-mono tabular-nums text-end'>
            <span className='truncate text-start' title={row.type}>
              {row.type}
            </span>
            <span className='text-subdued'>{row.size !== undefined ? Unit.KB(row.size) : '–'}</span>
            <span>{row.received.toLocaleString()}</span>
            <span>{row.sent.toLocaleString()}</span>
          </Grid>
        </StatCard.Row>
      ))}
    </StatCard.Root>
  );
};

ReplicatorMessagesCard.displayName = 'ReplicatorMessagesCard';
