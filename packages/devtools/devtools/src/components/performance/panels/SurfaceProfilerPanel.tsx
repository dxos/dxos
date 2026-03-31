//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { IconButton, Select } from '@dxos/react-ui';

import { type CustomPanelProps, Panel } from '../Panel';

const SLOW_TIME = 16; // One frame at 60fps.

const ALL = '__all__';

/**
 * Aggregated stats for a single profiled surface.
 */
export type SurfaceProfilerStats = {
  id: string;
  mountCount: number;
  updateCount: number;
  totalRenders: number;
  avgActualDuration: number;
  maxActualDuration: number;
  avgBaseDuration: number;
  lastActualDuration: number;
  lastCommitTime: number;
};

export const SurfaceProfilerPanel = ({
  stats,
  onClear,
  ...props
}: CustomPanelProps<{ stats?: SurfaceProfilerStats[]; onClear?: () => void }>) => {
  const [selectedId, setSelectedId] = useState<string>();

  if (!stats?.length) {
    return null;
  }

  const ids = stats.map((stat) => stat.id);
  const selected = selectedId !== ALL ? stats.find((stat) => stat.id === selectedId) : undefined;
  const displayed = selected ? [selected] : stats;

  return (
    <Panel
      {...props}
      icon='ph--timer--regular'
      title='Surfaces'
      info={<span>{stats.length.toLocaleString()}</span>}
      maxHeight={0}
    >
      <table className='table-fixed w-full text-xs font-mono'>
        <thead>
          <tr className='text-left text-subdued'>
            <th className='truncate'>Surface</th>
            <th className='w-[40px] text-right'>Mnt</th>
            <th className='w-[40px] text-right'>Upd</th>
            <th className='w-[60px] text-right'>Avg/ms</th>
            <th className='w-[60px] text-right'>Max/ms</th>
            <th className='w-[60px] text-right'>Last/ms</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((stat) => (
            <tr key={stat.id}>
              <td className='py-0.5 truncate cursor-pointer' title={stat.id}>
                {stat.id.split('/').pop()}
              </td>
              <td className='py-0.5 text-right'>{stat.mountCount}</td>
              <td className='py-0.5 text-right'>{stat.updateCount}</td>
              <td className='py-0.5 text-right'>
                <Duration value={stat.avgActualDuration} />
              </td>
              <td className='py-0.5 text-right'>
                <Duration value={stat.maxActualDuration} />
              </td>
              <td className='py-0.5 text-right'>
                <Duration value={stat.lastActualDuration} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div role='toolbar' className='flex gap-1 py-1 items-center justify-between'>
        <Select.Root value={selectedId ?? ''} onValueChange={(value) => setSelectedId(value || undefined)}>
          <Select.TriggerButton classNames='flex-1 text-xs font-mono' placeholder={`All (${stats.length})`} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                <Select.Option value={ALL}>All ({stats.length})</Select.Option>
                {ids.map((id) => (
                  <Select.Option key={id} value={id}>
                    {id}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        {onClear && <IconButton variant='ghost' icon='ph--trash--regular' iconOnly label='Reset' onClick={onClear} />}
      </div>
    </Panel>
  );
};

const Duration = ({ value }: { value: number }) => (
  <span className={value > SLOW_TIME ? 'text-error-text' : undefined}>{value.toFixed(1)}</span>
);
