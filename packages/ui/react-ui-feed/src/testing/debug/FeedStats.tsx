//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { IconButton, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useMessageList } from '../../components';
import { type FrameMeter, type Stat, Stats, warnAbove } from '../../debug';

/** What the feed currently holds, as opposed to how well it is holding it. */
const FEED_STATS: Stat[] = [
  {
    id: 'range',
    label: 'range',
  },
  {
    id: 'index',
    label: 'index',
  },
  {
    id: 'rows',
    label: 'rows',
  },
  {
    id: 'widgets',
    label: 'widgets',
  },
  {
    id: 'selected',
    label: 'selected',
  },
  {
    id: 'hits',
    label: 'hits',
  },
];

/**
 * The scroll-quality verdict: live rate, the rate at the pass's slowest fifth, the worst frame, and
 * how many frames stuttered. Only meaningful at a real keyboard — an agent's browser throttles the
 * frames this counts.
 *
 * `jumps` are rows moving against the scroll, sampled per frame; `shifts` are rows whose offset
 * changed after they were laid out; `breaks` are shifts that broke the order. All three should be
 * zero on a still feed, so each is coloured the moment it is not.
 */
const FRAME_STATS: Stat[] = [
  {
    id: 'fps',
    label: 'render',
    unit: 'fps',
    classNames: (value) => Number(value) > 0 && Number(value) < 50 && 'text-warning-text',
  },
  {
    id: 'p95',
    label: 'p95',
    unit: 'ms',
  },
  {
    id: 'worst',
    label: 'worst',
    unit: 'ms',
  },
  {
    id: 'hitches',
    label: 'hitches',
    classNames: warnAbove,
  },
  {
    id: 'jumps',
    label: 'jumps',
    classNames: warnAbove,
  },
  {
    id: 'shifts',
    label: 'shifts',
    classNames: warnAbove,
  },
  {
    id: 'breaks',
    label: 'breaks',
    classNames: warnAbove,
  },
];

export type FeedStatsProps = ThemedClassName<{
  meter: FrameMeter;
  streaming?: boolean;
  selected?: number;
  hits?: number;
}>;

/**
 * Everything measured about a feed, floating over it.
 *
 * It sits above the viewport rather than in a statusbar because a statusbar is part of the layout
 * being measured: a block of readouts that grows or wraps changes the height of the scroll
 * container, and every number in it would then describe a viewport the readouts themselves resized.
 */
export const FeedStats = ({ classNames, meter, streaming, selected = 0, hits = 0 }: FeedStatsProps) => {
  const { range, currentIndex, count, mountedRows, mountedWidgets, jumps, shifts, breaks, resetShifts } =
    useMessageList('FeedStats');

  // A pass is the interval between two presses, so the control is start/stop rather than a reset.
  const [recording, setRecording] = useState(false);
  const onRecord = useCallback(() => {
    meter.record();
    setRecording((value) => !value);
  }, [meter]);

  const values = useMemo(
    () => ({
      range: range ? `${range.startIndex} / ${range.endIndex}` : '—',
      index: `${currentIndex} / ${count}`,
      rows: mountedRows,
      widgets: mountedWidgets,
      selected,
      hits,
      fps: meter.fps,
      p95: meter.p95,
      worst: meter.worst,
      hitches: meter.hitches,
      jumps: jumps.count,
      shifts,
      breaks,
    }),
    [range, currentIndex, count, mountedRows, mountedWidgets, selected, hits, meter, jumps.count, shifts, breaks],
  );

  const label = `${meter.label} — p50 ${meter.p50} · ${meter.frames} frames · ${(meter.duration / 1000).toFixed(1)}s`;

  return (
    <div
      // Fixed width, not fitted: the widest line is the pass summary, whose length changes with the
      // elapsed time, so a panel sized to its content would resize once a second while being read.
      className={mx(
        'z-10 absolute bottom-3 right-3 w-[12rem] grid p-2 rounded-sm border border-separator bg-base-surface text-xs text-description',
        classNames,
      )}
      data-testid='feed.stats'
    >
      <div className='flex items-center min-w-0'>
        <span className='grow truncate' data-testid='feed.stream.state'>
          {streaming ? 'streaming…' : 'idle'}
        </span>
        <IconButton
          icon={recording ? 'ph--stop--regular' : 'ph--record--regular'}
          iconOnly
          label={recording ? 'End the pass' : 'Start a pass'}
          variant='ghost'
          size={3}
          data-testid='feed.debug.record'
          onClick={onRecord}
        />
        <IconButton
          icon='ph--arrow-counter-clockwise--regular'
          iconOnly
          label='Reset counters'
          variant='ghost'
          size={3}
          data-testid='feed.debug.reset'
          onClick={resetShifts}
        />
      </div>

      <Stats stats={FEED_STATS} values={values} />

      {/* The pass's extent rides in the tooltip: it is context for the readings rather than one of
          them, and its width changes with the elapsed time. */}
      <Stats
        stats={FRAME_STATS}
        values={values}
        classNames='border-t border-subdued-separator pt-1'
        title={label}
        data-testid='feed.frames'
      />
    </div>
  );
};
