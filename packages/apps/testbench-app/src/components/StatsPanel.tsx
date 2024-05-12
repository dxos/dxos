//
// Copyright 2024 DXOS.org
//

import { Database, Memory } from '@phosphor-icons/react';
import React from 'react';

import { type Stats } from '../hooks';

export type QueryPanelProps = {
  stats?: Stats;
};

// TODO(burdon): Factor out (for Composer).
// TODO(burdon): Reconcile with TraceView in diagnostics.
export const StatsPanel = ({ stats }: QueryPanelProps) => {
  return (
    <div className='flex flex-col w-full h-full bg-blue-100 divide-y divide-neutral-200 border-neutral-200'>
      <table className='w-full text-xs font-mono'>
        <tbody>
          {stats?.diagnostics?.spans.map(
            (span) =>
              span.endTs &&
              span.startTs && (
                <tr key={span.id}>
                  <td className='px-2 py-1 text-right'>{span.methodName}</td>
                  <td className='px-2 py-1 w-[80px] text-right'>{parseInt(span.endTs) - parseInt(span.startTs)}ms</td>
                </tr>
              ),
          )}
        </tbody>
      </table>
      <table className='w-full table-fixed text-xs font-mono'>
        <tbody>
          {stats?.queries?.map((query, i) => (
            <tr key={i}>
              <td className='px-2 py-1 text-right'>{query.objects}</td>
              <td className='px-2 py-1 w-[80px] text-right'>{query.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className='flex p-2 items-center justify-between'>
        <Database />
        <div className='flex items-center'>
          <span>{stats?.objects?.toLocaleString()}</span>
        </div>
      </div>
      <div className='flex p-2 items-center justify-between'>
        <Memory />
        <div className='flex items-center gap-2'>
          <span title='Used (heap size)'>
            {Unit.fixed(stats?.memory?.usedJSHeapSize ?? 0, Unit.M).toLocaleString()} MB
          </span>
          <span title='Allocated (heap size)'>
            {Unit.fixed(stats?.memory?.totalJSHeapSize ?? 0, Unit.M).toLocaleString()} MB
          </span>
          {stats?.memory?.used !== undefined && (
            <span title='Used (available)'>{Unit.fixed(stats.memory.used, Unit.P).toLocaleString()}%</span>
          )}
        </div>
      </div>
    </div>
  );
};

const Unit = {
  M: 1_000 * 1_000,
  P: 1 / 100,
  fixed: (n: number, s = 1) => (n / s).toFixed(2),
};
