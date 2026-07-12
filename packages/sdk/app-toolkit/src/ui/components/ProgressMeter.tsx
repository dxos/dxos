//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Progress } from '@dxos/progress';
import { composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type ProgressMeterProps = {
  state: Progress.TaskProgress;
};

/** Renders one progress provider's state as a labelled bar with count and ETA. */
export const ProgressMeter = composable<HTMLDivElement, ProgressMeterProps>(({ state, ...props }, forwardedRef) => {
  const { current, total, label, name, status } = state;
  const indeterminate = total === undefined;
  const fraction = indeterminate ? 0 : total === 0 ? 1 : Math.min(1, current / total);
  const eta = Progress.deriveEta(state);
  const rootProps = composableProps(props, { classNames: 'flex flex-col gap-1', role: 'group' });

  return (
    <div {...rootProps} ref={forwardedRef}>
      <div className='flex justify-between gap-2 text-xs text-description'>
        <span className='truncate'>{label ?? name}</span>
        <span className='font-mono shrink-0'>{total !== undefined ? `${current} / ${total}` : `${current}`}</span>
      </div>
      <div
        role='progressbar'
        aria-valuenow={indeterminate ? undefined : current}
        aria-valuemax={total}
        className='relative h-1 rounded overflow-hidden bg-separator'
      >
        {indeterminate ? (
          <div className='absolute inset-y-0 w-1/3 rounded bg-primary-surface animate-pulse' />
        ) : (
          <div
            className={mx(
              'absolute inset-y-0 start-0 rounded',
              status === 'error' ? 'bg-error-surface' : 'bg-primary-surface',
            )}
            style={{ width: `${fraction * 100}%` }}
          />
        )}
      </div>
      {status === 'error' && state.error ? (
        <div className='text-xs text-error-text truncate'>{state.error}</div>
      ) : (
        eta !== undefined &&
        status === 'running' && <div className='text-xs text-subdued'>{formatDuration(eta)} remaining</div>
      )}
    </div>
  );
});

ProgressMeter.displayName = 'ProgressMeter';

/** Compact human duration for an ETA (e.g. `12s`, `3m 05s`, `1h 02m`). */
export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.round(ms / 1_000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3_600);
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
};
