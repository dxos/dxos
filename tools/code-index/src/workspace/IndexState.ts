//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Schema from 'effect/Schema';

import type * as Watch from '../Watch.ts';

/**
 * The indexer's state as the footer shows it: the watcher thread's events folded into one value.
 * Pure and free of the store, since the browser imports it with the protocol.
 */

export const State = Schema.Union([
  /** Serving the store as it is (`--no-watch`); nothing will change it. */
  Schema.TaggedStruct('Static', {}),
  /** The watcher is starting and has not begun its first pass. */
  Schema.TaggedStruct('Starting', {}),
  /** A pass is running: `phase` is the one in progress, `step` of `steps` counting from 1. */
  Schema.TaggedStruct('Indexing', { phase: Schema.String, step: Schema.Number, steps: Schema.Number }),
  Schema.TaggedStruct('UpToDate', { at: Schema.Number, indexed: Schema.Number, removed: Schema.Number }),
  /** The last pass, or the watch, failed; `message` is its first line. */
  Schema.TaggedStruct('Failed', { message: Schema.String }),
]);

export type State = typeof State.Type;

/** The state plus a revision that moves whenever the counts `Info` reports may have changed. */
export const Status = Schema.Struct({ state: State, revision: Schema.Number });

export type Status = typeof Status.Type;

/** Scan, parse and commit; each reasoner adds one more. */
const FIXED_STEPS = 3;

const MAX_MESSAGE = 160;

const firstLine = (message: string): string => {
  const line = message.trim().split('\n')[0] ?? '';
  return line.length > MAX_MESSAGE ? `${line.slice(0, MAX_MESSAGE - 1)}…` : line;
};

/** The state after a phase finished: a `Progress` reports the phase that ended, so this names the next. */
const progressed = (state: State, progress: Extract<Watch.Event, { readonly _tag: 'Progress' }>): State => {
  // A pass whose `Started` was missed still counts up, against the steps every pass has.
  const steps = state._tag === 'Indexing' ? state.steps : FIXED_STEPS;
  const step = state._tag === 'Indexing' ? state.step : 1;
  const reasoning = steps > FIXED_STEPS;
  const at = (phase: string, next: number): State => ({ _tag: 'Indexing', phase, step: Math.min(next, steps), steps });
  switch (progress.progress.phase) {
    case 'scan':
      return at('parse', 2);
    case 'parse':
      return at('commit', 3);
    case 'commit':
      return at(reasoning ? 'reason' : 'commit', FIXED_STEPS + 1);
    case 'reasoner':
      return at('reason', step + 1);
    case 'reason':
    case 'reason-skipped':
    case 'summary':
      // Skipped reasoners jump the pass to its last step.
      return at(reasoning ? 'reason' : 'commit', steps);
  }
};

/** Folds one watcher event; `now` stamps a finished pass. */
export const apply = (state: State, event: Watch.Event, now: number): State => {
  switch (event._tag) {
    case 'Started':
      return { _tag: 'Indexing', phase: 'scan', step: 1, steps: FIXED_STEPS + event.reasoners };
    case 'Progress':
      return progressed(state, event);
    case 'Passed':
      return { _tag: 'UpToDate', at: now, indexed: event.indexed, removed: event.removed };
    case 'Failed':
      return { _tag: 'Failed', message: firstLine(event.message) };
  }
};

/** How the footer words a state; `undefined` when there is nothing worth a line. */
export const describe = (state: State): string | undefined => {
  switch (state._tag) {
    case 'Static':
      return undefined;
    case 'Starting':
      return 'Starting watcher…';
    case 'Indexing':
      return `Indexing · ${state.phase} ${state.step}/${state.steps}`;
    case 'UpToDate':
      return 'Up to date';
    case 'Failed':
      return `Indexing failed · ${state.message}`;
  }
};
