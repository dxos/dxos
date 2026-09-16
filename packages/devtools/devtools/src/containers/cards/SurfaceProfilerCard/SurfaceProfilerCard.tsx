//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type SurfaceProfilerStats as BaseSurfaceProfilerStats } from '@dxos/app-framework/ui';
import { IconButton } from '@dxos/react-ui';

import { StatCard } from '../../../components/index.ts';

/** One frame at 60fps. */
const SLOW_TIME = 16;

/** Profiler render timings joined with the surface's dispatch metrics. */
export type SurfaceProfilerStats = BaseSurfaceProfilerStats & {
  /** Candidates matched on the last dispatch (from Surface dev metrics). */
  candidates?: number;
  /** `true` when more candidates matched than rendered. */
  truncated?: boolean;
  /** Error boundary trips. */
  errors?: number;
  /** `true` when the surface's `data` prop identity churns without changing value. */
  dataUnstable?: boolean;
};

export type SurfaceProfilerCardProps = {
  stats?: SurfaceProfilerStats[];
  onClear?: () => void;
};

const describe = (stat: SurfaceProfilerStats): string =>
  [
    stat.id,
    `mounts: ${stat.mountCount}`,
    `updates: ${stat.updateCount}`,
    `candidates: ${stat.candidates ?? '–'}${stat.truncated ? '+' : ''}`,
    `errors: ${stat.errors ?? 0}`,
    `avg: ${stat.avgActualDuration.toFixed(1)}ms`,
    `max: ${stat.maxActualDuration.toFixed(1)}ms`,
    `last: ${stat.lastActualDuration.toFixed(1)}ms`,
    stat.dataUnstable ? 'unstable data' : undefined,
  ]
    .filter(Boolean)
    .join('\n');

export const SurfaceProfilerCard = ({ stats = [], onClear }: SurfaceProfilerCardProps) => (
  <StatCard.Root>
    <StatCard.Header
      icon='ph--timer--regular'
      title='Surfaces'
      info={stats.length.toLocaleString()}
      action={
        onClear && <IconButton iconOnly variant='ghost' icon='ph--trash--regular' label='Reset' onClick={onClear} />
      }
    />
    {stats.length === 0 && <StatCard.Row label='No surfaces profiled.' />}
    {stats.map((stat) => {
      const trouble = stat.dataUnstable || (stat.errors ?? 0) > 0;
      return (
        <StatCard.Row
          key={stat.id}
          icon={trouble ? 'ph--warning--regular' : undefined}
          iconClassNames='text-error-text'
          label={stat.id.split('/').pop()}
          title={describe(stat)}
          value={`${stat.avgActualDuration.toFixed(1)} / ${stat.maxActualDuration.toFixed(1)}`}
          unit='ms'
          warning={stat.avgActualDuration > SLOW_TIME}
        />
      );
    })}
  </StatCard.Root>
);

SurfaceProfilerCard.displayName = 'SurfaceProfilerCard';
