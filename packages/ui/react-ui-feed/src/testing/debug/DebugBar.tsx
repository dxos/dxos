//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { IconButton, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useMessageList } from '../../components';
import { type FrameMeter as FrameMeterState } from './frame-meter';

/**
 * One row of instruments, separate from the readouts above it: those describe the feed, these
 * describe how well it is behaving. Everything here is measured, clickable and resettable, and none
 * of it is part of a feed a reader would use.
 */
export const DebugBar = ({
  meter,
  jumps,
  shifts,
  breaks,
}: {
  meter: FrameMeterState;
  jumps: { count: number; worst: number };
  shifts: number;
  breaks: number;
}) => {
  const { resetShifts } = useMessageList('DebugBar');
  // A pass is the interval between two presses, so the control is start/stop rather than a reset.
  const [recording, setRecording] = useState(false);
  const onRecord = useCallback(() => {
    meter.record();
    setRecording((value) => !value);
  }, [meter]);

  return (
    // Fixed tracks, not flow: every number here changes while scrolling, and cells sized to their
    // content would shuffle the row on each update — an instrument that moves is hard to read.
    <div className='grid grid-cols-7 items-center gap-2 px-2 text-xs text-description tabular-nums'>
      <div className='col-span-4'>
        <FrameMeter meter={meter} />
      </div>
      <span className={mx('text-right', jumps.count > 0 && 'text-warning-text')} data-testid='feed.jumps'>
        {jumps.count} jumps
      </span>
      <span className={mx('text-right', shifts > 0 && 'text-warning-text')} data-testid='feed.shifts'>
        {shifts} shifts{breaks > 0 ? ` · ${breaks}!` : ''}
      </span>
      <span className='flex justify-end'>
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
      </span>
    </div>
  );
};

/**
 * The phase-1 verdict: live rate, the rate at the pass's slowest fifth, the worst frame, and how
 * many frames stuttered. Only meaningful at a real keyboard — an agent's browser throttles the
 * frames this counts.
 *
 * Clicking records the pass: the summary goes to the clipboard and the console, and a fresh pass
 * starts. So a measurement is click, gesture, click — and the median rate, which rarely says
 * anything the live rate has not, rides in the tooltip and the recorded line rather than on screen.
 */
const FrameMeter = ({ classNames, meter }: ThemedClassName<{ meter: FrameMeterState }>) => {
  const { label, fps, p50, p95, worst, hitches, frames, duration } = meter;

  // Readouts are text, not a control: the numbers change constantly and a button around them invites
  // a click that resets what the reader is trying to read. Recording a pass is its own IconButton.
  return (
    <span
      className={mx('grid grid-cols-4 tabular-nums whitespace-nowrap', classNames)}
      title={`${label} — p50 ${p50} · ${frames} frames · ${(duration / 1000).toFixed(1)}s`}
      data-testid='feed.frames'
    >
      <span className={mx('text-right', fps > 0 && fps < 50 && 'text-warning-text')}>{fps} fps</span>
      <span className={mx('text-right', p95 > 0 && p95 < 50 && 'text-warning-text')}>
        <span className='opacity-50'>p95</span> {p95}ms
      </span>
      <span className='text-right opacity-70'>
        <span className='opacity-50'>worst</span> {worst}ms
      </span>
      <span className={mx('text-right opacity-70', hitches > 0 && 'text-warning-text opacity-100')}>
        {hitches} hitches
      </span>
    </span>
  );
};

const Value = ({ label, value, unit }: { label?: string; value: number; unit?: string }) => (
  <div className='grid grid-cols-3 gap-1'>
    <span className='opacity-50'>{label}</span>
    <span className='text-right'>{value}</span>
    {unit && <span className='opacity-50'>{unit}</span>}
  </div>
);
