//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import {
  IconButton,
  Progress,
  Stepper,
  TextCrawl,
  type ThemedClassName,
  composable,
  composableProps,
  stepCount,
} from '@dxos/react-ui';

import { type ProgressState } from './types';

export type ProgressMeterProps = ThemedClassName<{
  state: ProgressState;
  /**
   * Cancels a run in flight, and clears one that failed — where there is nothing left to cancel, but
   * the meter would otherwise hold its place with no way to dismiss it.
   */
  onCancel?: () => void;
  /** Index of a stage the caller has singled out. */
  selected?: number;
  onSelect?: (step: { index: number; id: string }) => void;
}>;

/**
 * A run's full readout: what it is, where it is in its plan, how far through the stage in flight,
 * and how to stop it.
 *
 * One component with one geometry, whatever the monitor reports. The parts are chosen from the
 * state — a {@link Stepper} where the run declared a plan, a {@link Progress} fraction where the
 * phase counts and a sweep where it cannot, a crawl of the phases it has named — but the three rows
 * are always drawn, so a phase that stops being countable never changes the readout's height and
 * never moves the layout around it.
 */
export const ProgressMeter = composable<HTMLDivElement, ProgressMeterProps>(
  ({ state, onCancel, selected, onSelect, ...props }, forwardedRef) => {
    const { current = 0, total, label, status, note, error, etaMs } = state;
    const indeterminate = total === undefined;
    const fraction = indeterminate ? 0 : total === 0 ? 1 : Math.min(1, current / total);
    const active = status === 'running' || status === 'pending';
    const failed = status === 'error';
    // The producer only revises `elapsedMs` when it touches the task, so tick locally while active.
    const elapsedMs = useElapsed(state.startedAt, active, state.elapsedMs);
    // One control, two jobs: it cancels a run in flight, and clears one that ended in an error —
    // where there is nothing left to cancel, but the meter would otherwise hold its place with no
    // way to dismiss it. Clearing needs no `cancellable`: that flag says the PRODUCER can be
    // interrupted, which is irrelevant once the run is over.
    const cancellable = !!onCancel && (failed || (state.cancellable === true && active));
    const stages = stepCount(state.phases);
    const notes = useNotes(note, state.startedAt);

    return (
      <div
        {...composableProps(props, {
          // Explicit rows, not auto-placement: every row is drawn whatever the state, so the meter
          // is the same height determinate, indeterminate or phased.
          classNames: 'grid grid-rows-[24px_15px_24px] gap-0.5 px-1',
          role: 'group',
        })}
        ref={forwardedRef}
      >
        <div className='flex justify-between items-center gap-2 text-xs text-description'>
          <span className='truncate'>{label}</span>
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

        {/* A declared plan is drawn as its stages, which carry the fraction on the line leaving the
            one in flight; with no plan there is only the fraction, so a bare bar says it. */}
        {stages > 0 ? (
          <Stepper
            classNames='self-center'
            steps={state.phases ?? 0}
            active={state.phase}
            fraction={fraction}
            indeterminate={indeterminate && active}
            error={failed}
            selected={selected}
            onSelect={onSelect}
          />
        ) : (
          <Progress
            classNames='w-full self-center'
            progress={fraction}
            indeterminate={indeterminate && active}
            error={failed}
            aria-label={label}
          />
        )}

        <div className='flex items-center justify-between gap-2'>
          {failed && error ? (
            <div className='text-xs text-error-text truncate'>{error}</div>
          ) : (
            <>
              {/* The phases the run has named, in its own words, crawling as it moves through them. */}
              <TextCrawl classNames='min-w-0 flex-1' textClassNames='text-xs text-subdued' lines={notes} greedy />
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

//
// Hooks
//

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

/**
 * The phases a run has named so far, in order, for the crawl to scroll through.
 *
 * The state carries only the note in flight, so the history is accumulated here: a crawl fed one
 * line at a time has nothing to scroll from and reads as a plain label. `startedAt` keys the run —
 * a fresh one starts a fresh list rather than continuing the last one's.
 */
const useNotes = (note: string | undefined, startedAt: string | undefined): string[] => {
  const [notes, setNotes] = useState<string[]>(() => (note ? [note] : []));
  const runRef = useRef(startedAt);
  useEffect(() => {
    if (runRef.current !== startedAt) {
      runRef.current = startedAt;
      setNotes(note ? [note] : []);
      return;
    }
    if (note !== undefined) {
      setNotes((notes) => (notes[notes.length - 1] === note ? notes : [...notes, note]));
    }
  }, [note, startedAt]);
  return notes;
};

//
// Util
//

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
