//
// Copyright 2024 DXOS.org
//

import { ArrowClockwise, ChartBar, Cpu, Database, Timer } from '@phosphor-icons/react';
import React, { type FC, useEffect, useState } from 'react';

import { Button } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { type Stats } from '../hooks';

const SLOW_TIME = 250;

const Trace: FC<{ duration: number }> = ({ duration }) => (
  <span className={mx(duration > SLOW_TIME && 'text-red-500')}>{Math.floor(duration).toLocaleString()}ms</span>
);

export type QueryPanelProps = {
  stats?: Stats;
  onRefresh?: () => void;
};

// TODO(burdon): Factor out (for Composer).
// TODO(burdon): Reconcile with TraceView in diagnostics.
export const StatsPanel = ({ stats, onRefresh }: QueryPanelProps) => {
  const spans = [...(stats?.diagnostics?.spans ?? [])];
  spans.reverse();

  const queries = [...(stats?.queries ?? [])];
  queries.reverse();

  // TODO(burdon): Break into panels.
  return (
    <div className='flex flex-col w-full h-full bg-neutral-50 divide-y divide-neutral-200 border-neutral-200'>
      <div className='flex items-center justify-between'>
        <span className='flex items-center gap-1 px-2 py-2'>
          <ChartBar className={getSize(4)} />
          <span>Stats</span>
        </span>
        <Button classNames='!bg-transparent' density='fine' value='ghost' onClick={onRefresh}>
          <ArrowClockwise className={getSize(4)} />
        </Button>
      </div>
      <Perf />
      <div className='flex flex-col'>
        <div className='flex items-center justify-between px-2 py-2'>
          <div className='flex items-center gap-1'>
            <Timer className={getSize(4)} />
            <span>Spans</span>
          </div>
          <span className='px-1'>{queries.length.toLocaleString()}</span>
        </div>
        <div className='w-full max-h-[240px] px-2 overflow-y-scroll'>
          <table className='w-full text-xs font-mono'>
            <tbody>
              {spans.map(
                (span) =>
                  span.endTs &&
                  span.startTs && (
                    <tr key={span.id}>
                      <td className='p-1 text-right'>{span.methodName}</td>
                      <td className='p-1 w-[80px]' />
                      <td className='p-1 w-[80px] text-right'>
                        <Trace duration={parseInt(span.endTs) - parseInt(span.startTs)} />
                      </td>
                    </tr>
                  ),
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className='flex flex-col'>
        <div className='flex items-center justify-between px-2 py-2'>
          <div className='flex items-center gap-1'>
            <Database className={getSize(4)} />
            <span>Queries</span>
          </div>
          <span className='px-1'>{queries.length.toLocaleString()}</span>
        </div>
        <div className='w-full max-h-[240px] px-2 overflow-y-scroll'>
          <table className='w-full text-xs font-mono'>
            <tbody>
              {queries.map((query, i) => (
                <tr key={i}>
                  <td className='p-1 text-right' title={JSON.stringify(query.filter, undefined, 2)}>
                    {/* TODO(burdon): Why itemId? */}
                    {query.filter.type?.itemId}
                  </td>
                  <td>[{String(query.active)}]</td>
                  <td className='p-1 w-[80px] text-right'>{query.metrics.objectsReturned.toLocaleString()}</td>
                  <td className='p-1 w-[80px] text-right'>
                    <Trace duration={query.metrics.executionTime} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className='flex px-2 py-2 items-center justify-between'>
        <div className='flex items-center gap-1'>
          <Database className={getSize(4)} />
          <span>Database</span>
        </div>
        <div className='flex items-center'>
          <span>{stats?.objects?.toLocaleString()}</span>
        </div>
      </div>
      <div className='flex px-2 py-2 items-center justify-between'>
        <div className='flex items-center gap-1'>
          <Cpu className={getSize(4)} />
          <span>Memory</span>
        </div>
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

console.log(PerformanceObserver.supportedEntryTypes);

const Perf = () => {
  // TODO(burdon): Warn if FPS drops.
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const times: number[] = [];
    const refreshLoop = () => {
      window.requestAnimationFrame(() => {
        const now = performance.now();
        while (times.length > 0 && times[0] <= now - 1000) {
          times.shift();
        }
        times.push(now);
        setFps(times.length);
        refreshLoop();
      });
    };

    refreshLoop();
  }, []);

  // console.log(Performance.getEntries());
  useEffect(() => {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Log the entry and all associated details.
        console.log(entry.toJSON());
      }
    });

    // https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing
    po.observe({ entryTypes: ['longtask', 'largest-contentful-paint'], buffered: true });
    return () => po.disconnect();
  }, []);

  return <div>{fps}</div>;
};
