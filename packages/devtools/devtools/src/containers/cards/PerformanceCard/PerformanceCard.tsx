//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';
import { type PerformanceEntryLike } from '../../../hooks/index.ts';
import { SLOW_TIME, Unit } from '../util.tsx';

export type PerformanceCardProps = {
  entries?: PerformanceEntryLike[];
};

export const PerformanceCard = ({ entries = [] }: PerformanceCardProps) => (
  <StatCard.Root>
    <StatCard.Header
      icon='ph--hourglass-simple-low--regular'
      hue={STAT_CARD_HUES.system}
      title='Performance'
      info={entries.length.toLocaleString()}
    />
    {entries.length === 0 && <StatCard.Row span label='No entries.' />}
    {entries.map((entry, index) => {
      const label = [entry.entryType, entry.name].filter(Boolean).join('/');
      return (
        <StatCard.Row
          key={index}
          label={label}
          tooltip={label}
          value={Unit.ms(entry.duration)}
          unit='ms'
          warning={entry.duration > SLOW_TIME}
        />
      );
    })}
  </StatCard.Root>
);

PerformanceCard.displayName = 'PerformanceCard';
