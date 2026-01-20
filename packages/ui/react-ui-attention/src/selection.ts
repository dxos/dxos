//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';

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
  private readonly _stateAtom: Atom.Writable<{ selections: Record<string, Selection> }>;

  constructor(
    private readonly _registry: Registry.Registry,
    initial: Record<string, Selection> = {},
  ) {
    this._stateAtom = Atom.make<{ selections: Record<string, Selection> }>({
      selections: { ...initial },
    });
  }

  /**
   * Get the state atom for reactive access in the graph system.
   */
  get stateAtom(): Atom.Writable<{ selections: Record<string, Selection> }> {
    return this._stateAtom;
  }

  /**
   * Subscribe to changes in the selection state.
   */
  subscribe(cb: (state: { selections: Record<string, Selection> }) => void): () => void {
    this._registry.get(this._stateAtom);
    return this._registry.subscribe(this._stateAtom, () => {
      cb(this._registry.get(this._stateAtom));
    });
  }

  getSelectionContexts(): string[] {
    return Object.keys(this._registry.get(this._stateAtom).selections);
  }

  getSelection<T extends SelectionMode | undefined>(
    contextId: string,
    mode: T = undefined as T,
  ): T extends undefined ? Selection | undefined : Selection {
    const state = this._registry.get(this._stateAtom);
    const selection = state.selections[contextId];
    if (!mode || selection) {
      return selection as any;
    }

    // Create new selection for the context.
    const newSelection = defaultSelection(mode);
    this._registry.set(this._stateAtom, {
      selections: { ...state.selections, [contextId]: newSelection },
    });
    return newSelection as any;
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
    const selection = this.getSelection(contextId, 'single');
    invariant(selection?.mode === 'single', 'Selection mode is not single');
    const state = this._registry.get(this._stateAtom);
    this._registry.set(this._stateAtom, {
      selections: {
        ...state.selections,
        [contextId]: { ...selection, id },
      },
    });
  }

  updateMulti(contextId: string, ids: string[]) {
    const selection = this.getSelection(contextId, 'multi');
    invariant(selection?.mode === 'multi', 'Selection mode is not multi');
    const state = this._registry.get(this._stateAtom);
    this._registry.set(this._stateAtom, {
      selections: {
        ...state.selections,
        [contextId]: { ...selection, ids: [...ids] },
      },
    });
  }

  updateRange(contextId: string, from: string, to: string) {
    const selection = this.getSelection(contextId, 'range');
    invariant(selection?.mode === 'range', 'Selection mode is not range');
    const state = this._registry.get(this._stateAtom);
    this._registry.set(this._stateAtom, {
      selections: {
        ...state.selections,
        [contextId]: { ...selection, from, to },
      },
    });
  }

  updateMultiRange(contextId: string, ranges: { from: string; to: string }[]) {
    const selection = this.getSelection(contextId, 'multi-range');
    invariant(selection?.mode === 'multi-range', 'Selection mode is not multi-range');
    const state = this._registry.get(this._stateAtom);
    this._registry.set(this._stateAtom, {
      selections: {
        ...state.selections,
        [contextId]: { ...selection, ranges: [...ranges] },
      },
    });
  }

  clearSelection(contextId: string): void {
    const selection = this.getSelection(contextId);
    if (!selection) {
      return;
    }

    const state = this._registry.get(this._stateAtom);
    const clearedSelection = Match.type<Selection>().pipe(
      Match.when({ mode: 'single' }, (s) => ({ ...s, id: undefined })),
      Match.when({ mode: 'multi' }, (s) => ({ ...s, ids: [] })),
      Match.when({ mode: 'range' }, (s) => ({ ...s, from: undefined, to: undefined })),
      Match.when({ mode: 'multi-range' }, (s) => ({ ...s, ranges: [] })),
      Match.exhaustive,
    )(selection);

    this._registry.set(this._stateAtom, {
      selections: {
        ...state.selections,
        [contextId]: clearedSelection,
      },
    });
  }

  toggleSelection(contextId: string, id: string): void {
    const selection = this.getSelection(contextId, 'multi');
    invariant(selection?.mode === 'multi', 'Selection mode is not multi');

    const state = this._registry.get(this._stateAtom);
    const newIds = selection.ids.includes(id)
      ? selection.ids.filter((existingId) => existingId !== id)
      : [...selection.ids, id];

    this._registry.set(this._stateAtom, {
      selections: {
        ...state.selections,
        [contextId]: { ...selection, ids: newIds },
      },
    });
  }
}
