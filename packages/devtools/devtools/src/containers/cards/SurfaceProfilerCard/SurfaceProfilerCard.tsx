//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type SurfaceProfilerStats as BaseSurfaceProfilerStats } from '@dxos/app-framework/ui';
import { Field, Flex, Grid, IconButton, SystemIconButton, Tooltip } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
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
  /** The selected role NSID; its row is current and `detail` is shown beneath the rows. */
  selected?: string;
  onSelect?: (role: string | undefined) => void;
  /** The selected role's mounted surfaces, each rendered as JSON. */
  detail?: SurfaceDetail[];
};

/** One mounted surface of the selected role: its id, the `data` it was dispatched with, and its metric. */
export type SurfaceDetail = {
  id?: string;
  data?: Record<string, any>;
  metric?: Record<string, unknown>;
};

/** The role segment of a profiler id (`surface/<id>/<role>`). */
const roleId = (id: string): string => id.slice(id.lastIndexOf('/') + 1);

/** The role without the shared `org.dxos.role.` prefix. */
const roleName = (id: string): string => roleId(id).replace(/^org\.dxos\.role\./, '');

/** Every mounted instance of one role, its timings pooled: a navtree mounts one surface per row. */
type RoleGroup = {
  role: string;
  roleId: string;
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
      roleId: roleId(stat.id),
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

/** The surface id of a profiler id (`surface/<id>/<role>`). */
const surfaceId = (id: string): string => id.slice('surface/'.length, id.lastIndexOf('/'));

/** Tooltip body for a role row: the pooled figures, then the mounted surfaces by id. */
const RoleDetail = ({ group }: { group: RoleGroup }) => (
  <Flex column gap='xs' classNames='max-w-64 text-xs'>
    <span>
      {group.ids.length} mounted · {group.totalRenders} renders · {group.errors} errors
    </span>
    {group.trouble && <span className='text-error-text'>unstable data or errors</span>}
    <Flex column>
      {group.ids.map((id) => (
        <span key={id} className='font-mono text-info-text truncate'>
          {surfaceId(id)}
        </span>
      ))}
    </Flex>
  </Flex>
);

/** Role takes the slack; fixed count, average and maximum tracks line the figures up as a grid. */
const ROW_TRACKS = ['1fr', '2rem', '2rem', '2rem'];

export const SurfaceProfilerCard = ({
  stats = [],
  debug,
  onDebugChange,
  onClear,
  selected,
  onSelect,
  detail,
}: SurfaceProfilerCardProps) => {
  const groups = groupByRole(stats);
  const selectedGroup = groups.find((group) => group.roleId === selected);
  return (
    <StatCard.Root>
      <StatCard.Header
        icon='ph--frame-corners--regular'
        hue={STAT_CARD_HUES.ui}
        title='Surfaces'
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
      {groups.length === 0 && <StatCard.Row span label='No surfaces mounted.' />}
      {groups.length > 0 && (
        <StatCard.Row unit='ms'>
          <Grid cols={ROW_TRACKS} gap='sm' classNames='text-end text-description'>
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
          current={group.roleId === selected}
          onClick={onSelect && (() => onSelect(group.roleId === selected ? undefined : group.roleId))}
        >
          <Grid
            cols={ROW_TRACKS}
            gap='sm'
            classNames={mx('font-mono tabular-nums text-end', group.avgActualDuration > SLOW_TIME && 'text-error-text')}
          >
            <Tooltip.Trigger asChild content={<RoleDetail group={group} />}>
              <span className='truncate text-start'>{group.role}</span>
            </Tooltip.Trigger>
            <span className='text-description'>{group.ids.length}</span>
            <span>{group.totalRenders > 0 ? group.avgActualDuration.toFixed(1) : '–'}</span>
            <span>{group.totalRenders > 0 ? group.maxActualDuration.toFixed(1) : '–'}</span>
          </Grid>
        </StatCard.Row>
      ))}
      {selectedGroup && detail && (
        <>
          {/* One block per surface: the stringifier folds repeated references into back-references,
              and sibling surfaces routinely share their `data`. */}
          {detail.map((surface, index) => (
            <StatCard.Row
              key={surface.id ?? index}
              label={selectedGroup.role}
              control={<SystemIconButton.Clipboard iconOnly onCopy={() => JSON.stringify(surface, null, 2)} />}
            >
              <JsonHighlighter
                classNames='text-sm'
                data={surface}
                replacer={{ maxDepth: 5, maxArrayLen: 10, maxStringLen: 120 }}
              />
            </StatCard.Row>
          ))}
        </>
      )}
    </StatCard.Root>
  );
};

SurfaceProfilerCard.displayName = 'SurfaceProfilerCard';
