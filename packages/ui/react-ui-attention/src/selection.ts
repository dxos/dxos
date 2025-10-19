//
// Copyright 2025 DXOS.org
//

import { untracked } from '@preact/signals-core';
import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';
import { type Live, live } from '@dxos/live-object';

// TODO(burdon): Reconcile with @dxos/graph.

export type SelectionMode = 'single' | 'multi' | 'range' | 'multi-range';

export const SelectionSchema = Schema.Union(
  Schema.Struct({ mode: Schema.Literal('single'), id: Schema.optional(Schema.String) }).pipe(Schema.mutable),
  Schema.Struct({ mode: Schema.Literal('multi'), ids: Schema.Array(Schema.String).pipe(Schema.mutable) }).pipe(
    Schema.mutable,
  ),
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

export type Selection = Schema.Schema.Type<typeof SelectionSchema>;

export const defaultSelection = Match.type<SelectionMode>().pipe(
  Match.withReturnType<Selection>(),
  Match.when('single', () => ({ mode: 'single' })),
  Match.when('multi', () => ({ mode: 'multi', ids: [] })),
  Match.when('range', () => ({ mode: 'range' })),
  Match.when('multi-range', () => ({ mode: 'multi-range', ranges: [] })),
  Match.exhaustive,
);

export type SelectionResult<T extends SelectionMode> = T extends 'single'
  ? string | undefined
  : T extends 'multi'
    ? string[]
    : T extends 'range'
      ? { from: string; to: string } | undefined
      : T extends 'multi-range'
        ? { from: string; to: string }[]
        : never;

// TODO(burdon): Refactor.
export const getSelectionSet = (selectionManager: SelectionManager, contextId?: string) => {
  const ids = new Set<string>(contextId ? [contextId] : []);
  for (const context of selectionManager.getSelectionContexts()) {
    const selection = selectionManager.getSelection(context);
    if (selection?.mode === 'multi') {
      for (const id of selection.ids) {
        ids.add(id);
      }
    }
  }

  return ids;
};

/**
 * Manages selection state for different contexts.
 * Each context maintains its own selection mode and state.
 */
export class SelectionManager {
  private readonly _state = live<{ selections: Record<string, Selection> }>({ selections: {} });

  constructor(initial: Record<string, Selection> = {}) {
    if (Object.keys(initial).length > 0) {
      untracked(() => {
        this._state.selections = initial;
      });
    }
  }

  getSelectionContexts(): string[] {
    return Object.keys(this._state.selections);
  }

  getSelection<T extends SelectionMode | undefined>(
    contextId: string,
    mode: T = undefined as T,
  ): T extends undefined ? Live<Selection> | undefined : Live<Selection> {
    const selection = untracked(() => this._state.selections[contextId]);
    if (!mode || selection) {
      return selection;
    }

    return untracked(() => {
      this._state.selections[contextId] = defaultSelection(mode);
      return this._state.selections[contextId];
    });
  }

  // TODO(burdon): Disambiguate with getSelection?
  getSelected<T extends SelectionMode>(contextId: string, mode: T = 'multi' as T): SelectionResult<T> {
    const selection = this.getSelection(contextId, mode);
    invariant(selection?.mode === mode, 'Selection mode mismatch');
    return Match.type<Selection>().pipe(
      Match.when({ mode: 'single' }, (s) => s.id),
      Match.when({ mode: 'multi' }, (s) => s.ids),
      Match.when({ mode: 'range' }, (s) => (s.from && s.to ? { from: s.from, to: s.to } : undefined)),
      Match.when({ mode: 'multi-range' }, (s) => s.ranges),
      Match.exhaustive,
    )(selection) as any;
  }

  updateSingle(contextId: string, id: string): void {
    untracked(() => {
      const selection = this.getSelection(contextId, 'single');
      invariant(selection?.mode === 'single', 'Selection mode is not single');
      selection.id = id;
    });
  }

  updateMulti(contextId: string, ids: string[]) {
    untracked(() => {
      const selection = this.getSelection(contextId, 'multi');
      invariant(selection?.mode === 'multi', 'Selection mode is not multi');
      selection.ids.splice(0, selection.ids.length, ...ids);
    });
  }

  updateRange(contextId: string, from: string, to: string) {
    untracked(() => {
      const selection = this.getSelection(contextId, 'range');
      invariant(selection?.mode === 'range', 'Selection mode is not range');
      selection.from = from;
      selection.to = to;
    });
  }

  updateMultiRange(contextId: string, ranges: { from: string; to: string }[]) {
    untracked(() => {
      const selection = this.getSelection(contextId, 'multi-range');
      invariant(selection?.mode === 'multi-range', 'Selection mode is not multi-range');
      selection.ranges.splice(0, selection.ranges.length, ...ranges);
    });
  }

  clearSelection(contextId: string): void {
    untracked(() => {
      const selection = this.getSelection(contextId);
      Match.type<Selection | undefined>().pipe(
        Match.when(undefined, () => {
          // No-op.
        }),
        Match.when({ mode: 'single' }, (s) => {
          s.id = undefined;
        }),
        Match.when({ mode: 'multi' }, (s) => {
          s.ids.splice(0, s.ids.length);
        }),
        Match.when({ mode: 'range' }, (s) => {
          s.from = undefined;
          s.to = undefined;
        }),
        Match.when({ mode: 'multi-range' }, (s) => {
          s.ranges.splice(0, s.ranges.length);
        }),
        Match.exhaustive,
      )(selection);
    });
  }

  toggleSelection(contextId: string, id: string): void {
    untracked(() => {
      const selection = this.getSelection(contextId, 'multi');
      invariant(selection?.mode === 'multi', 'Selection mode is not multi');

      if (selection.ids.includes(id)) {
        const index = selection.ids.indexOf(id);
        selection.ids.splice(index, 1);
      } else {
        selection.ids.push(id);
      }
    });
  }
}
