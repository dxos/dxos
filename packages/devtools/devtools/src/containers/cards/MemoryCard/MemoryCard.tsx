//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';
import { type MemoryInfo } from '../../../hooks/index.ts';
import { Unit } from '../util.tsx';

const MEM_WARNING = 40 / 100;

export type MemoryCardProps = {
  memory?: MemoryInfo;
};

export const MemoryCard = ({ memory }: MemoryCardProps) => {
  const warning = (memory?.used ?? 0) > MEM_WARNING;
  return (
    <StatCard.Root>
      <StatCard.Header icon='ph--cpu--regular' hue={STAT_CARD_HUES.system} title='Memory' />
      <StatCard.Row label='Used heap' value={Unit.MB(memory?.usedJSHeapSize)} unit='MB' />
      <StatCard.Row label='Allocated heap' value={Unit.MB(memory?.totalJSHeapSize)} unit='MB' />
      <StatCard.Row
        icon={warning ? 'ph--warning--regular' : undefined}
        iconClassNames='text-error-text'
        label='Used of available'
        value={Unit.percent(memory?.used)}
        unit='%'
        warning={warning}
      />
    </StatCard.Root>
  );
};

MemoryCard.displayName = 'MemoryCard';
