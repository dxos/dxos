//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import {
  IconButton,
  type ProgressProps,
  Progress,
  type ThemedClassName,
  composable,
  composableProps,
  stepCount,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type ProgressMeterProps = ThemedClassName<ProgressProps>;

/**
 * A run's full readout: what it is, where it is in its plan, how far through the current phase, and
 * how to stop it.
 *
 * When the current phase has a known total, a bar with a count and an ETA; otherwise a live elapsed
 * clock and no bar, since a perpetually-pulsing indeterminate bar conveys nothing. A run that
 * declares a plan draws it as steps either way — which phase is in flight is the one thing an
 * uncountable phase can still report.
 *
 * Takes the same {@link ProgressState} as {@link ProgressBar}.
 */
export const ProgressMeter = composable<HTMLDivElement, ProgressMeterProps>(
  ({ state, onCancel, selected, onSelect, ...props }, forwardedRef) => {
    const { current = 0, total, label, status, note, error, etaMs } = state;
    const indeterminate = total === undefined;
    const fraction = indeterminate ? 0 : total === 0 ? 1 : Math.min(1, current / total);
    const active = status === 'running' || status === 'pending';
    // The producer only revises `elapsedMs` when it touches the task, so tick locally while active.
    const elapsedMs = useElapsed(state.startedAt, active, state.elapsedMs);
    // One control, two jobs: it cancels a run in flight, and clears one that ended in an error —
    // where there is nothing left to cancel, but the meter would otherwise hold its place with no way
    // to dismiss it. Clearing needs no `cancellable`: that flag says the PRODUCER can be interrupted,
    // which is irrelevant once the run is over.
    const failed = status === 'error';
    const cancellable = !!onCancel && (failed || (state.cancellable === true && active));
    const steps = stepCount(state.phases);

    return (
      <div
        {...composableProps(props, { classNames: 'grid grid-rows-[24px_4px_24px] gap-0.5 px-1', role: 'group' })}
        ref={forwardedRef}
      >
        <div className='flex justify-between items-center gap-2 text-xs text-description'>
          <span className='truncate'>{label}</span>
          {steps > 0 && <Progress.Steps classNames='shrink-0' state={state} selected={selected} onSelect={onSelect} />}
          <div className='flex items-center gap-1 shrink-0'>
            <span className='font-mono'>
              {indeterminate ? (active ? formatDuration(elapsedMs) : '') : `${current} / ${total}`}
            </span>
            {cancellable && (
              <IconButton
                density='sm'
                variant='ghost'
                size={3}
                square
                icon='ph--x--regular'
                iconOnly
                label={failed ? 'Dismiss' : 'Cancel'}
                onClick={onCancel}
              />
            )}
          </div>
        </div>

        {/* A progress line only when a real fraction is known; an indeterminate bar conveys nothing. */}
        {!indeterminate && (
          <div
            role='progressbar'
            aria-valuenow={current}
            aria-valuemax={total}
            className='relative h-full rounded overflow-hidden bg-separator'
          >
            <div
              className={mx(
                // Ease the width between updates so incremental advances glide rather than jump.
                'absolute inset-y-0 start-0 rounded transition-[width] duration-500 ease-linear',
                failed ? 'bg-error-surface' : 'bg-primary-surface',
              )}
              style={{ width: `${fraction * 100}%` }}
            />
          </div>
        )}

        <div className='flex items-center justify-between gap-2'>
          {failed && error ? (
            <div className='text-xs text-error-text truncate'>{error}</div>
          ) : (
            <>
              {/* What the current phase is doing, in the producer's words. */}
              <div className='text-xs text-subdued truncate'>{note}</div>
              {!indeterminate && etaMs !== undefined && status === 'running' && (
                <div className='text-xs text-subdued shrink-0'>{formatDuration(etaMs)} remaining</div>
              )}
            </>
          )}
        </div>
      </div>
    );
  },
);

ProgressMeter.displayName = 'ProgressMeter';

/**
 * Elapsed milliseconds since `startedAt`, ticking every second while `active` (a producer only
 * revises `elapsedMs` when it touches the task, so one that registers and idles would never advance).
 * Falls back to the supplied `elapsedMs` when there is no start time.
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

/** Compact human duration (e.g. `12s`, `3m 05s`, `1h 02m`). */
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
