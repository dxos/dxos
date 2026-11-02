//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useSyncExternalStore } from 'react';

import { mx } from '@dxos/ui-theme';

import { type Recording } from './recording.ts';

/** Bars kept in the DOM; enough to fill a wide panel, the oldest are clipped on the left. */
const MAX_BARS = 600;

/** Quietest level drawn, dBFS; peaks are drawn on a log scale so speech is not a flat line. */
const FLOOR_DB = -60;

const barHeight = (peak: number): number => {
  const db = 20 * Math.log10(peak + 1e-10);
  return Math.max(0.04, Math.min(1, (db - FLOOR_DB) / -FLOOR_DB));
};

export type WaveformProps = {
  recording: Recording;
  classNames?: string;
};

/** Scrolling peak waveform of the recording, newest on the right. */
export const Waveform = ({ recording, classNames }: WaveformProps) => {
  const subscribe = useCallback((listener: () => void) => recording.subscribe(listener), [recording]);
  const count = useSyncExternalStore(subscribe, () => recording.bars.length);
  const bars = recording.bars.slice(Math.max(0, count - MAX_BARS), count);

  return (
    <div
      role='img'
      aria-label={`Recording waveform, ${recording.duration.toFixed(1)} seconds`}
      className={mx('flex items-center justify-end gap-px h-16 px-2 overflow-hidden', classNames)}
    >
      {bars.map(({ peak }, index) => (
        <div
          key={count - bars.length + index}
          className='shrink-0 w-0.5 rounded-full bg-current text-success-text'
          style={{ height: `${barHeight(peak) * 100}%` }}
        />
      ))}
    </div>
  );
};
