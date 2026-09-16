//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type SurfaceProfilerStats as BaseSurfaceProfilerStats } from '@dxos/app-framework/ui';
import { Field, Grid, IconButton } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';

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
  /** Whether the surface highlight overlay is on; the row's switch is shown when both are given. */
  debug?: boolean;
  onDebugChange?: (debug: boolean) => void;
  onClear?: () => void;
};

/** The role segment of a profiler id (`surface/<id>/<role>`), without the shared `org.dxos.role.` prefix. */
const roleName = (id: string): string => (id.split('/').pop() ?? id).replace(/^org\.dxos\.role\./, '');

/** Every mounted instance of one role, its timings pooled: a navtree mounts one surface per row. */
type RoleGroup = {
  role: string;
  ids: string[];
  totalRenders: number;
  avgActualDuration: number;
  maxActualDuration: number;
  errors: number;
  trouble: boolean;
};

const groupByRole = (stats: SurfaceProfilerStats[]): RoleGroup[] => {
  const groups = new Map<string, RoleGroup>();
  for (const stat of stats) {
    const role = roleName(stat.id);
    const group = groups.get(role) ?? {
      role,
      ids: [],
      totalRenders: 0,
      avgActualDuration: 0,
      maxActualDuration: 0,
      errors: 0,
      trouble: false,
    };
    const renders = group.totalRenders + stat.totalRenders;
    groups.set(role, {
      ...group,
      ids: [...group.ids, stat.id],
      totalRenders: renders,
      // The pooled mean over every render, not the mean of per-instance means.
      avgActualDuration:
        renders > 0
          ? (group.avgActualDuration * group.totalRenders + stat.avgActualDuration * stat.totalRenders) / renders
          : 0,
      maxActualDuration: Math.max(group.maxActualDuration, stat.maxActualDuration),
      errors: group.errors + (stat.errors ?? 0),
      trouble: group.trouble || !!stat.dataUnstable || (stat.errors ?? 0) > 0,
    });
  }
  return [...groups.values()].sort((a, b) => b.maxActualDuration - a.maxActualDuration || a.role.localeCompare(b.role));
};

const describe = (group: RoleGroup): string =>
  [
    `${group.ids.length} mounted`,
    `renders: ${group.totalRenders}`,
    `errors: ${group.errors}`,
    group.trouble ? 'unstable data or errors' : undefined,
    ...group.ids,
  ]
    .filter(Boolean)
    .join('\n');

/** Role takes the slack; fixed count, average and maximum tracks line the figures up as a grid. */
const ROW_TRACKS = ['1fr', '2rem', '2rem', '2rem'];

export const SurfaceProfilerCard = ({ stats = [], debug, onDebugChange, onClear }: SurfaceProfilerCardProps) => {
  const groups = groupByRole(stats);
  return (
    <StatCard.Root>
      <StatCard.Header
        icon='ph--frame-corners--regular'
        hue={STAT_CARD_HUES.ui}
        title='Surfaces'
        info={stats.length.toLocaleString()}
        action={
          onClear && (
            <IconButton iconOnly variant='ghost' icon='ph--arrow-clockwise--regular' label='Reset' onClick={onClear} />
          )
        }
      />
      {onDebugChange && (
        <StatCard.Row
          label='Highlight surfaces'
          action={<Field.Switch checked={!!debug} onCheckedChange={(checked) => onDebugChange(checked)} />}
        />
      )}
      {groups.length === 0 && <StatCard.Row label='No surfaces mounted.' />}
      {groups.length > 0 && (
        <StatCard.Row unit='ms'>
          <Grid cols={ROW_TRACKS} gap='sm' classNames='text-end text-subdued'>
            <span className='text-start'>role</span>
            <span>×</span>
            <span>avg</span>
            <span>max</span>
          </Grid>
        </StatCard.Row>
      )}
      {groups.map((group) => (
        <StatCard.Row
          key={group.role}
          icon={group.trouble ? 'ph--warning--regular' : undefined}
          iconClassNames='text-error-text'
          unit='ms'
        >
          <Grid
            cols={ROW_TRACKS}
            gap='sm'
            classNames={mx('font-mono tabular-nums text-end', group.avgActualDuration > SLOW_TIME && 'text-error-text')}
          >
            <span className='truncate text-start' title={describe(group)}>
              {group.role}
            </span>
            <span className='text-subdued'>{group.ids.length}</span>
            <span>{group.totalRenders > 0 ? group.avgActualDuration.toFixed(1) : '–'}</span>
            <span>{group.totalRenders > 0 ? group.maxActualDuration.toFixed(1) : '–'}</span>
          </Grid>
        </StatCard.Row>
      ))}
    </StatCard.Root>
  );
};

SurfaceProfilerCard.displayName = 'SurfaceProfilerCard';
