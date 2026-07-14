//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Progress } from '@dxos/progress';
import { IconButton, composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type ProgressMeterProps = {
  state: Progress.TaskProgress;
  /** When provided (and the task is active + cancellable), a cancel control invokes this. */
  onCancel?: () => void;
};

/**
 * Renders one progress provider's state. When the total is known, a labelled bar with count and
 * ETA; otherwise (no estimate) no bar is shown — just a live elapsed-time readout, since a
 * perpetually-pulsing indeterminate bar conveys nothing.
 */
export const ProgressMeter = composable<HTMLDivElement, ProgressMeterProps>(
  ({ state, onCancel, ...props }, forwardedRef) => {
    const { current, total, label, name, status } = state;
    const indeterminate = total === undefined;
    const fraction = indeterminate ? 0 : total === 0 ? 1 : Math.min(1, current / total);
    const eta = Progress.deriveEta(state);
    const active = status === 'running' || status === 'pending';
    // The registry only recomputes elapsedMs when the task is touched, so tick locally while active.
    const elapsedMs = useElapsed(state.startedAt, active, state.elapsedMs);
    const rootProps = composableProps(props, { classNames: 'flex flex-col gap-1', role: 'group' });
    // Show the cancel control only while the task is still active and the producer registered a handler.
    const cancellable = !!onCancel && state.cancellable && active;

    return (
      <div {...rootProps} ref={forwardedRef}>
        <div className='flex justify-between items-center gap-2 text-xs text-description'>
          <span className='truncate'>{label ?? name}</span>
          <div className='flex items-center gap-1 shrink-0'>
            <span className='font-mono'>
              {indeterminate ? (active ? formatDuration(elapsedMs) : '') : `${current} / ${total}`}
            </span>
            {cancellable && (
              <IconButton variant='ghost' size={3} icon='ph--x--regular' iconOnly label='Cancel' onClick={onCancel} />
            )}
          </div>
        </div>
        {/* A progress line only when a real fraction is known; an indeterminate bar conveys nothing. */}
        {!indeterminate && (
          <div
            role='progressbar'
            aria-valuenow={current}
            aria-valuemax={total}
            className='relative h-1 rounded overflow-hidden bg-separator'
          >
            <div
              className={mx(
                'absolute inset-y-0 start-0 rounded',
                status === 'error' ? 'bg-error-surface' : 'bg-primary-surface',
              )}
              style={{ width: `${fraction * 100}%` }}
            />
          </div>
        )}
        {status === 'error' && state.error ? (
          <div className='text-xs text-error-text truncate'>{state.error}</div>
        ) : (
          !indeterminate &&
          eta !== undefined &&
          status === 'running' && <div className='text-xs text-subdued'>{formatDuration(eta)} remaining</div>
        )}
      </div>
    );
  },
);

ProgressMeter.displayName = 'ProgressMeter';

/**
 * Elapsed milliseconds since `startedAt`, ticking every second while `active` (the registry only
 * revises `elapsedMs` on touch, so a task that registers and idles would otherwise never advance).
 * Falls back to the registry's `elapsedMs` when the task has no start time.
 */
const useElapsed = (startedAt: string | undefined, active: boolean, fallbackMs: number | undefined): number => {
  const start = startedAt ? Date.parse(startedAt) : undefined;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active || start === undefined) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [active, start]);
  if (start === undefined) {
    return fallbackMs ?? 0;
  }
  return Math.max(0, now - start);
};

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
