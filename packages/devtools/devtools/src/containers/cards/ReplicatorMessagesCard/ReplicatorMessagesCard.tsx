//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { StatCard } from '../../../components/index.ts';
import { type DatabaseInfo } from '../../../hooks/index.ts';
import { Unit } from '../util.tsx';

export type ReplicatorMessagesCardProps = {
  database?: DatabaseInfo;
};

type MessageRow = { type: string; sent: number; received: number; size?: number };

export const ReplicatorMessagesCard = ({ database }: ReplicatorMessagesCardProps) => {
  const replicator = database?.dataStats?.replicator;
  const rows: MessageRow[] = Object.entries(replicator?.countByMessage ?? {})
    .map(([type, counts]) => ({ type, ...counts, size: replicator?.avgSizeByMessage[type] }))
    .sort((a, b) => a.type.localeCompare(b.type));
  const sent = rows.reduce((acc, row) => acc + row.sent, 0);
  const received = rows.reduce((acc, row) => acc + row.received, 0);

  return (
    <StatCard.Root>
      <StatCard.Header icon='ph--envelope--regular' title='Messages' info={`${received}↓ ${sent}↑`} />
      {rows.length === 0 && <StatCard.Row label='No messages.' />}
      {rows.map((row) => (
        <StatCard.Row
          key={row.type}
          label={row.size !== undefined ? `${row.type} (${Unit.KB(row.size)} KB)` : row.type}
          value={`${row.received.toLocaleString()}↓ ${row.sent.toLocaleString()}↑`}
        />
      ))}
    </StatCard.Root>
  );
};

ReplicatorMessagesCard.displayName = 'ReplicatorMessagesCard';
