//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Progress } from '@dxos/progress';
import { IconButton, ThemedClassName, composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type ProgressMeterProps = ThemedClassName<{
  state: Progress.TaskProgress;
  /** When provided (and the task is active + cancellable), a cancel control invokes this. */
  onCancel?: () => void;
}>;

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
    // Show the cancel control only while the task is still active and the producer registered a handler.
    const cancellable = !!onCancel && state.cancellable && active;
    const etaLabel = !indeterminate && eta !== undefined && status === 'running' ? formatDuration(eta) : undefined;
    const showError = status === 'error' && !!state.error;
    // Rows are auto-sized and each is dropped when empty. Fixed tracks reserved height for the bar
    // and the note whether or not either rendered, so an indeterminate task with no note showed a
    // label above ~28px of blank statusbar — and pushed its note into the 4px bar track.
    const showDetail = showError || !!state.note || etaLabel !== undefined;

    return (
      <div {...composableProps(props, { classNames: 'grid gap-0.5 px-1', role: 'group' })} ref={forwardedRef}>
        <div className='flex justify-between items-center gap-2 min-h-6 text-xs text-description'>
          <span className='truncate'>{label ?? name}</span>
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
                label='Cancel'
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
            className='relative h-1 rounded overflow-hidden bg-separator'
          >
            <div
              className={mx(
                // Ease the width between updates so incremental advances glide rather than jump.
                'absolute inset-y-0 start-0 rounded transition-[width] duration-500 ease-linear',
                status === 'error' ? 'bg-error-surface' : 'bg-primary-surface',
              )}
              style={{ width: `${fraction * 100}%` }}
            />
          </div>
        )}

        {showDetail && (
          <div className='flex items-center justify-between gap-2 min-h-6'>
            {showError ? (
              <div className='text-xs text-error-text truncate'>{state.error}</div>
            ) : (
              <>
                {/* The producer's breakdown of what is outstanding (e.g. per-kind counts). */}
                <div className='text-xs text-subdued truncate'>{state.note}</div>
                {etaLabel && <div className='text-xs text-subdued shrink-0'>{etaLabel} remaining</div>}
              </>
            )}
          </div>
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
