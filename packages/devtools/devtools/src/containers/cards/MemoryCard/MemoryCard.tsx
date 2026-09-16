//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Unit } from '@dxos/util';

import { StatCard } from '../../../components/index.ts';
import { type MemoryInfo } from '../../../hooks/index.ts';

const MEM_WARNING = 40 / 100;

export type MemoryCardProps = {
  memory?: MemoryInfo;
};

export const MemoryCard = ({ memory }: MemoryCardProps) => {
  const warning = (memory?.used ?? 0) > MEM_WARNING;
  return (
    <StatCard.Root>
      <StatCard.Header icon='ph--cpu--regular' title='Memory' />
      <StatCard.Row label='Used heap' value={String(Unit.Megabyte(memory?.usedJSHeapSize ?? 0))} />
      <StatCard.Row label='Allocated heap' value={String(Unit.Megabyte(memory?.totalJSHeapSize ?? 0))} />
      <StatCard.Row
        icon={warning ? 'ph--warning--regular' : undefined}
        iconClassNames='text-error-text'
        label='Used of available'
        value={String(Unit.Percent(memory?.used ?? 0))}
        warning={warning}
      />
    </StatCard.Root>
  );
};

MemoryCard.displayName = 'MemoryCard';
