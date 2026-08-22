//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef, useEffect, useRef, useState } from 'react';

import { useThemeContext } from '../../hooks';
import { type ProgressStyleProps } from '../../theme';
import { type ThemedClassName, composable, composableProps } from '../../util';
import { IconButton } from '../Button';
import { TextCrawl } from '../TextCrawl';

import { ProgressSteps } from './ProgressSteps';
import { type ProgressProps, stepCount } from './types';

//
// Bar
//

type ProgressBarProps = ThemedClassName<
  ComponentPropsWithRef<'span'> &
    ProgressStyleProps & {
      progress?: number;
    }
>;

/**
 * A bare fill bar: a fraction of a track, or an indeterminate sweep.
 *
 * The smallest thing that reports progress, for a host that supplies its own chrome (a panel footer,
 * an image placeholder). {@link ProgressRoot} is the full readout built around it.
 */
const ProgressBar = forwardRef<HTMLSpanElement, ProgressBarProps>(
  ({ classNames, children, progress = 0, indeterminate, error, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <span
        // An indeterminate bar is a progressbar with no value — that is what the role means, so it
        // needs no separate live-region role.
        role='progressbar'
        {...(!indeterminate && { 'aria-valuemin': 0, 'aria-valuemax': 1, 'aria-valuenow': progress })}
        {...props}
        className={tx('progress.root', { indeterminate, error }, classNames)}
        ref={forwardedRef}
      >
        <span
          className={tx('progress.bar', { indeterminate, error })}
          {...(!indeterminate && { style: { width: `${Math.round(progress * 100)}%` } })}
        />
        {children}
      </span>
    );
  },
);

ProgressBar.displayName = 'Progress.Bar';

//
// Root
//

export type ProgressRootProps = ThemedClassName<ProgressProps>;

/**
 * A run's full readout: what it is, where it is in its plan, how far through the phase in flight,
 * and how to stop it.
 *
 * One component with one geometry, whatever the monitor reports. The parts are chosen from the
 * state — a bar fraction where the phase counts and a sweep where it cannot, a step chain where the
 * run declared a plan, a crawl of the phases it has named — but the three rows are always drawn, so
 * a phase that stops being countable never changes the readout's height and never moves the layout
 * around it.
 */
const ProgressRoot = composable<HTMLDivElement, ProgressRootProps>(
  ({ state, onCancel, selected, onSelect, ...props }, forwardedRef) => {
    const { current = 0, total, label, status, note, error, etaMs } = state;
    const indeterminate = total === undefined;
    const fraction = indeterminate ? 0 : total === 0 ? 1 : Math.min(1, current / total);
    const active = status === 'running' || status === 'pending';
    const failed = status === 'error';
    // The producer only revises `elapsedMs` when it touches the task, so tick locally while active.
    const elapsedMs = useElapsed(state.startedAt, active, state.elapsedMs);
    // One control, two jobs: it cancels a run in flight, and clears one that ended in an error —
    // where there is nothing left to cancel, but the readout would otherwise hold its place with no
    // way to dismiss it. Clearing needs no `cancellable`: that flag says the PRODUCER can be
    // interrupted, which is irrelevant once the run is over.
    const cancellable = !!onCancel && (failed || (state.cancellable === true && active));
    const steps = stepCount(state.phases);
    const notes = useNotes(note, state.startedAt);

    return (
      <div
        {...composableProps(props, {
          // Explicit rows, not auto-placement: every row is drawn whatever the state, so the
          // readout is the same height determinate, indeterminate or phased.
          classNames: 'grid grid-rows-[24px_4px_24px] gap-0.5 px-1',
          role: 'group',
        })}
        ref={forwardedRef}
      >
        <div className='flex justify-between items-center gap-2 text-xs text-description'>
          <span className='truncate'>{label}</span>
          {steps > 0 && <ProgressSteps state={state} selected={selected} onSelect={onSelect} />}
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

        <ProgressBar
          classNames='w-full'
          progress={fraction}
          indeterminate={indeterminate && active}
          error={failed}
          aria-label={label}
        />

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

ProgressRoot.displayName = 'Progress.Root';

export const Progress = {
  Root: ProgressRoot,
  Bar: ProgressBar,
  Steps: ProgressSteps,
};

export type { ProgressBarProps };

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
