//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef, useEffect, useRef, useState } from 'react';

import { Progress as ProgressModel } from '@dxos/progress';
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

export type ProgressMeterProps = ThemedClassName<
  Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
    state?: ProgressModel.TaskProgress;
    /** Index of a stage the caller has singled out. */
    selected?: number;
    onSelect?: (step: { index: number; id: string }) => void;
    /**
     * Cancels a run in flight, and clears one that failed — where there is nothing left to cancel,
     * but the meter would otherwise hold its place with no way to dismiss it.
     */
    onCancel?: () => void;
    /** How long a run must last before its meter appears, in ms. */
    delay?: number;
    /** Once shown, how long the meter stays, in ms. */
    minDuration?: number;
  }
>;

/**
 * Long enough that a run which finishes almost immediately never shows a meter at all, short enough
 * that a real one still feels responsive.
 */
const DEFAULT_DELAY = 500;

/** Once shown, how long the meter stays — a readout worth showing is worth reading. */
const DEFAULT_MIN_DURATION = 1_000;

/**
 * Shows the meter for a run, or nothing when there is none.
 *
 * The two bounds are why this wrapper exists rather than a bare `state && <meter/>`: a run that
 * starts and finishes between two frames would otherwise pop a readout into the statusbar and take
 * it away again, and the flash reads as a glitch rather than as progress. `delay` withholds the
 * meter until the run has lasted long enough to be worth reporting; `minDuration` then holds it long
 * enough to be read.
 */
export const ProgressMeter = composable<HTMLDivElement, ProgressMeterProps>(
  ({ state, delay = DEFAULT_DELAY, minDuration = DEFAULT_MIN_DURATION, ...props }, forwardedRef) => {
    // The last state seen while visible: the run can end before `minDuration` is up, and the meter
    // has to keep rendering something for the rest of it.
    const held = useRef(state);
    if (state) {
      held.current = state;
    }

    const visible = useDeferredVisible(Boolean(state), delay, minDuration);
    if (!visible || !held.current) {
      return null;
    }

    return <InnerProgressMeter {...props} state={held.current} ref={forwardedRef} />;
  },
);

ProgressMeter.displayName = 'ProgressMeter';

/**
 * Whether a thing that is `present` should be shown, given a delay before it appears and a minimum
 * time it stays once it has.
 *
 * Both bounds exist because a surface that flashes is worse than one that is slightly late: a
 * readout appearing and vanishing inside a few frames reads as a fault, and one that appears at all
 * should stay long enough to be read.
 */
const useDeferredVisible = (present: boolean, delay: number, minDuration: number): boolean => {
  const [visible, setVisible] = useState(present && delay === 0);
  // When it became visible, so `minDuration` counts from the render rather than from the moment
  // `present` flipped — a meter held back by `delay` has not been on screen at all yet.
  const shownAt = useRef<number | undefined>(visible ? Date.now() : undefined);

  useEffect(() => {
    if (present) {
      if (visible) {
        return;
      }

      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    }

    if (!visible) {
      return;
    }

    const elapsed = shownAt.current === undefined ? minDuration : Date.now() - shownAt.current;
    const remaining = minDuration - elapsed;
    if (remaining <= 0) {
      shownAt.current = undefined;
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      shownAt.current = undefined;
      setVisible(false);
    }, remaining);
    return () => clearTimeout(timer);
  }, [present, visible, delay, minDuration]);

  return visible;
};

type InnerProgressMeterProps = ProgressMeterProps & { state: ProgressModel.TaskProgress };

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
export const InnerProgressMeter = composable<HTMLDivElement, InnerProgressMeterProps>(
  ({ state, selected, onSelect, onCancel, ...props }, forwardedRef) => {
    const { current = 0, total, label, name, status, note, error } = state;
    // Derived here rather than supplied: `deriveEta` projects from the task's own elapsed time, so
    // every producer gets the same estimate without computing one.
    const etaMs = ProgressModel.deriveEta(state);
    const indeterminate = total === undefined;
    const fraction = indeterminate ? 0 : total === 0 ? 1 : Math.min(1, current / total);
    const active = status === 'running' || status === 'pending';
    const failed = status === 'error';
    // The producer only revises `elapsedMs` when it touches the task, so tick locally while active.
    const elapsedMs = useElapsed(state.startedAt, active, state.elapsedMs);
    // One control, two jobs: it cancels a run in flight, and clears one that ended in an error —
    // where there is nothing left to cancel, but the meter would otherwise hold its place with no
    // way to dismiss it. Clearing needs no `cancellable`: that flag says the PRODUCER can be
    // interrupted, which is irrelevant once the run is over. A finished run disables the control
    // rather than dropping it: a button that vanishes on completion takes its width with it and
    // slides the readout beside it sideways, at the exact moment the reader is looking at it.
    const cancellable = failed || (state.cancellable === true && active);
    const stages = stepCount(state.phases);
    // The crawl is the meter's only text now, so it opens with the run's name: without it a list of
    // meters would say what each is doing and never which task it is.
    const lines = useNotes(label ?? name, note, state.startedAt);

    return (
      <div
        {...composableProps(props, {
          // Explicit rows, not auto-placement: both rows are drawn whatever the state, so the meter
          // is the same height determinate, indeterminate or phased, and the layout around it never
          // moves when a phase stops being countable.
          classNames: 'grid grid-rows-[24px_24px] px-1',
          role: 'group',
        })}
        ref={forwardedRef}
      >
        <div className='flex items-center justify-between gap-2 text-xs'>
          {failed && error ? (
            <div className='min-w-0 flex-1 text-error-text truncate'>{error}</div>
          ) : (
            /* What the run is and what it is doing, in its own words, crawling as it moves through its phases. */
            <TextCrawl classNames='min-w-0 flex-1' textClassNames='text-xs text-description' lines={lines} greedy />
          )}
          <div className='flex items-center gap-1 shrink-0 text-description'>
            <span className='font-mono'>
              {indeterminate ? (active ? formatDuration(elapsedMs) : '') : `${current} / ${total}`}
            </span>
            {!indeterminate && etaMs !== undefined && status === 'running' && (
              <span className='text-description'>{formatDuration(etaMs)} left</span>
            )}
            {onCancel && (
              <IconButton
                density='sm'
                variant='ghost'
                size={3}
                icon='ph--x--regular'
                iconOnly
                disabled={!cancellable}
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
            // Uncounted while it runs, and still uncounted when it fails — that is what fills the
            // bar red rather than emptying it. A run that simply ended has nothing left to sweep.
            indeterminate={indeterminate && (active || failed)}
            error={failed}
            aria-label={label ?? name}
          />
        )}
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
 * The run's name, then the phases it has named so far, for the crawl to scroll through.
 *
 * The state carries only the note in flight, so the history is accumulated here: a crawl fed one
 * line at a time has nothing to scroll from and reads as a plain label. `startedAt` keys the run —
 * a fresh one starts a fresh list rather than continuing the last one's.
 */
const useNotes = (label: string | undefined, note: string | undefined, startedAt: string | undefined): string[] => {
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
  return label === undefined ? notes : [label, ...notes];
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
