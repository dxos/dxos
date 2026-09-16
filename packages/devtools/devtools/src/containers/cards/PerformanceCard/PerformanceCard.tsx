//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { StatCard } from '../../../components/index.ts';
import { type PerformanceEntryLike } from '../../../hooks/index.ts';
import { Duration } from '../util.tsx';

export type PerformanceCardProps = {
  entries?: PerformanceEntryLike[];
};

export const PerformanceCard = ({ entries = [] }: PerformanceCardProps) => (
  <StatCard.Root>
    <StatCard.Header icon='ph--hourglass-simple-low--regular' title='Performance' info={entries.length.toLocaleString()} />
    {entries.length === 0 && <StatCard.Row label='No entries.' />}
    {entries.map((entry, index) => {
      const label = [entry.entryType, entry.name].filter(Boolean).join('/');
      return <StatCard.Row key={index} label={label} title={label} value={<Duration duration={entry.duration} />} />;
    })}
  </StatCard.Root>
);

PerformanceCard.displayName = 'PerformanceCard';
