//
// Copyright 2026 DXOS.org
//

//
// Undo and redo behind one interface (VIEWS.md §8): every edit runs as a commit, which records the heads either side
// of it and the paths it wrote; undo patches those paths back. A host with its own history (Composer's tracker)
// supplies the history; standalone, the canvas keeps this local one.
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import {
  type ElementId,
  type VersionChange,
  type VersionedSource,
  type ViewId,
  patchSource,
  recordChanges,
  unionPaths,
} from '../model/index.ts';
import { type Projection } from './projection.ts';

/** Where an edit happened: the View path it was made in (inside an isolated Object), and the selection before it. */
export type HistoryContext = {
  readonly path: readonly ViewId[];
  readonly selection: readonly ElementId[];
  readonly isolate?: ViewId;
};

export type HistoryState = { readonly canUndo: boolean; readonly canRedo: boolean };

export type CommitOptions = {
  /** Consecutive commits with one key inside the merge window are one undo step (typing in a field, nudging). */
  mergeKey?: string;
};

export type CanvasHistory = {
  /**
   * Runs `change` as one undo step and reports whether it changed anything; a commit inside another joins it, so a
   * gesture of several intents undoes at once.
   */
  commit: (change: () => void, options?: CommitOptions) => boolean;
  /** Undoes the latest step, reporting whether there was one; a host's history may finish it asynchronously. */
  undo: () => boolean;
  redo: () => boolean;
  readonly state: Atom.Atom<HistoryState>;
  /** Starts following the host's history (its undo and redo, from anywhere); returns the disconnect. */
  connect: () => () => void;
  /** What the history reaches of the view showing it, filled in by that view as it renders. */
  readonly view: HistoryView;
};

/** The parts of a view a history reaches, which exist only once the view has rendered. */
export type HistoryView = {
  /** The open View's projection, whose own model (if any) is patched with the store. */
  projection?: Projection;
  /** Returns the view to where an undone or redone edit happened. */
  restore?: (context: HistoryContext) => void;
};

/** What the canvas gives its history. */
export type HistoryBinding = {
  registry: Registry.AtomRegistry;
  /** The store, versioned (`storeVersions`). */
  store: VersionedSource;
  context: () => HistoryContext;
  view: HistoryView;
};

export type CreateHistory = (binding: HistoryBinding) => CanvasHistory;

/** The binding's view, after a patch: the projection catches up and the view returns to where the edit was. */
export const afterPatch = (view: HistoryView, context: HistoryContext | undefined) => {
  view.projection?.restored?.();
  if (context) {
    view.restore?.(context);
  }
};

export const isHistoryContext = (value: unknown): value is HistoryContext =>
  typeof value === 'object' &&
  value !== null &&
  'path' in value &&
  'selection' in value &&
  Array.isArray(value.path) &&
  Array.isArray(value.selection);

/** One source's part in a commit. */
export type SourceChange = { source: VersionedSource; change: VersionChange };

/**
 * Runs commits for a history: nested commits join the outermost, which reports what it changed, and where the view
 * was when it began, to `record`.
 */
export const createCommitter = (
  binding: Pick<HistoryBinding, 'store' | 'context'> & { model: () => VersionedSource | undefined },
  record: (changes: SourceChange[], context: HistoryContext, options: CommitOptions) => void,
): CanvasHistory['commit'] => {
  let depth = 0;
  return (change, options = {}) => {
    const model = binding.model();
    const sources = model ? [binding.store, model] : [binding.store];
    const context = depth === 0 ? binding.context() : undefined;
    depth++;
    let changes: SourceChange[];
    try {
      changes = recordChanges(sources, change).flatMap((entry, index) =>
        entry ? [{ source: sources[index], change: entry }] : [],
      );
    } finally {
      depth--;
    }
    if (context && changes.length > 0) {
      record(changes, context, options);
    }
    return changes.length > 0;
  };
};

type LocalEntry = {
  changes: SourceChange[];
  context: HistoryContext;
  mergeKey?: string;
  updated: number;
};

export type LocalHistoryOptions = {
  /** Entries kept on each stack. */
  limit?: number;
  /** Milliseconds within which commits with one merge key fold together. */
  mergeWindow?: number;
  /** The clock merging reads; injectable for tests. */
  now?: () => number;
};

const fold = (earlier: SourceChange[], later: SourceChange[]): SourceChange[] => {
  const folded = earlier.map(({ source, change }) => {
    const next = later.find((entry) => entry.source === source)?.change;
    return next
      ? { source, change: { before: change.before, after: next.after, paths: unionPaths(change.paths, next.paths) } }
      : { source, change };
  });
  return [...folded, ...later.filter(({ source }) => !earlier.some((entry) => entry.source === source))];
};

/** The history a canvas keeps for itself when its host has none: two stacks of patches in memory. */
export const createLocalHistory =
  ({ limit = 100, mergeWindow = 500, now = Date.now }: LocalHistoryOptions = {}): CreateHistory =>
  (binding) => {
    const past: LocalEntry[] = [];
    const future: LocalEntry[] = [];
    // An entry may take later commits only until an undo or redo has stepped over it.
    let mergeable = false;
    const state = Atom.keepAlive(Atom.make<HistoryState>({ canUndo: false, canRedo: false }));
    const publish = () => binding.registry.set(state, { canUndo: past.length > 0, canRedo: future.length > 0 });

    const commit = createCommitter(
      { ...binding, model: () => binding.view.projection?.model },
      (changes, context, { mergeKey }) => {
        const time = now();
        const last = past.at(-1);
        if (
          mergeable &&
          last &&
          mergeKey !== undefined &&
          last.mergeKey === mergeKey &&
          time - last.updated <= mergeWindow
        ) {
          last.changes = fold(last.changes, changes);
          last.updated = time;
        } else {
          past.push({ changes, context, mergeKey, updated: time });
          past.splice(0, Math.max(0, past.length - limit));
        }
        future.length = 0;
        mergeable = true;
        publish();
      },
    );

    /** Moves `entry` from one end of its changes to the other, its sources in reverse order on the way back. */
    const step = (entry: LocalEntry, direction: 'undo' | 'redo') => {
      const changes = direction === 'undo' ? [...entry.changes].reverse() : entry.changes;
      for (const { source, change } of changes) {
        const [from, to] = direction === 'undo' ? [change.after, change.before] : [change.before, change.after];
        patchSource(source, { from, to, paths: change.paths });
      }
      afterPatch(binding.view, entry.context);
    };

    return {
      commit,
      undo: () => {
        const entry = past.pop();
        if (!entry) {
          return false;
        }
        mergeable = false;
        step(entry, 'undo');
        future.push(entry);
        publish();
        return true;
      },
      redo: () => {
        const entry = future.pop();
        if (!entry) {
          return false;
        }
        mergeable = false;
        step(entry, 'redo');
        past.push(entry);
        publish();
        return true;
      },
      state,
      connect: () => () => {},
      view: binding.view,
    };
  };

/** A history for a view that edits nothing it should undo (a host projection that owns its side effects). */
export const noHistory: CreateHistory = (binding) => {
  const state = Atom.keepAlive(Atom.make<HistoryState>({ canUndo: false, canRedo: false }));
  return {
    commit: createCommitter({ ...binding, model: () => binding.view.projection?.model }, () => {}),
    undo: () => false,
    redo: () => false,
    state,
    connect: () => () => {},
    view: binding.view,
  };
};

/** The projection with every intent applied as a commit of `history`, so each one is an undo step. */
export const withHistory = (projection: Projection, history: Pick<CanvasHistory, 'commit'>): Projection => ({
  ...projection,
  apply: (intent) => void history.commit(() => projection.apply(intent)),
});
