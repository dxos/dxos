//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';

import { type Aspect, type Manager, define } from './ViewState';

export type SelectionMode = 'single' | 'multi' | 'range' | 'multi-range';

export const Selection = Schema.Union(
  Schema.Struct({
    mode: Schema.Literal('single'),
    id: Schema.optional(Schema.String),
  }).pipe(Schema.mutable),
  Schema.Struct({
    mode: Schema.Literal('multi'),
    ids: Schema.Array(Schema.String).pipe(Schema.mutable),
  }).pipe(Schema.mutable),
  Schema.Struct({
    mode: Schema.Literal('range'),
    from: Schema.optional(Schema.String),
    to: Schema.optional(Schema.String),
  }).pipe(Schema.mutable),
  Schema.Struct({
    mode: Schema.Literal('multi-range'),
    ranges: Schema.Array(Schema.Struct({ from: Schema.String, to: Schema.String })).pipe(Schema.mutable),
  }).pipe(Schema.mutable),
).pipe(Schema.mutable);

export type Selection = Schema.Schema.Type<typeof Selection>;

export const defaultValue = Match.type<SelectionMode>().pipe(
  Match.withReturnType<Selection>(),
  Match.when('single', () => ({ mode: 'single' })),
  Match.when('multi', () => ({ mode: 'multi', ids: [] })),
  Match.when('range', () => ({ mode: 'range' })),
  Match.when('multi-range', () => ({ mode: 'multi-range', ranges: [] })),
  Match.exhaustive,
);

export type Result<T extends SelectionMode> = T extends 'single'
  ? string | undefined
  : T extends 'multi'
    ? string[]
    : T extends 'range'
      ? { from: string; to: string } | undefined
      : T extends 'multi-range'
        ? { from: string; to: string }[]
        : never;

/** Selection state for a context, stored in memory (ephemeral, per-device session). */
export const aspect: Aspect<Selection> = define<Selection>({
  key: 'selection',
  backend: 'memory',
  schema: Selection,
  defaultValue: () => ({ mode: 'multi', ids: [] }),
});

/**
 * Extract the typed result for `mode` from a stored selection value, returning the requested
 * mode's default when the stored value is absent or holds a different mode.
 */
export const resolve = <T extends SelectionMode>(selection: Selection | undefined, mode: T): Result<T> => {
  const value = selection?.mode === mode ? selection : defaultValue(mode);
  // Cast required because TypeScript cannot relate the `Match` result to the generic `T`.
  return Match.type<Selection>().pipe(
    Match.when({ mode: 'single' }, (s) => s.id),
    Match.when({ mode: 'multi' }, (s) => s.ids),
    Match.when({ mode: 'range' }, (s) => (s.from && s.to ? { from: s.from, to: s.to } : undefined)),
    Match.when({ mode: 'multi-range' }, (s) => s.ranges),
    Match.exhaustive,
  )(value) as Result<T>;
};

/** Toggle `id` within a multi selection; resets to a multi selection if the current value differs. */
export const toggle = (selection: Selection | undefined, id: string): Selection => {
  const ids = selection?.mode === 'multi' ? selection.ids : [];
  return { mode: 'multi', ids: ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id] };
};

/** Union of all multi-selected ids across every selection context, plus an optional explicit id. */
export const getValue = (manager: Manager, contextId?: string): Set<string> => {
  const ids = new Set<string>(contextId ? [contextId] : []);
  for (const context of manager.contexts(aspect)) {
    const selection = manager.get(aspect, context);
    if (selection.mode === 'multi') {
      for (const id of selection.ids) {
        ids.add(id);
      }
    }
  }

  return ids;
};
