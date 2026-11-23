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

import { type ElementId, type ViewId } from '@dxos/scene';

import { type VersionChange, type VersionedSource, patchSource, recordChanges, unionPaths } from '../model/index.ts';

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
   * gesture of several edits undoes at once.
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
  /** Returns the view to where an undone or redone edit happened. */
  restore?: (context: HistoryContext) => void;
};

/** What the canvas gives its history. */
export type HistoryBinding = {
  registry: Registry.AtomRegistry;
  /** The store, versioned (`drawStateVersions`). */
  store: VersionedSource;
  context: () => HistoryContext;
  view: HistoryView;
};

export type CreateHistory = (binding: HistoryBinding) => CanvasHistory;

/** The binding's view, after a patch: it returns to where the edit was. */
export const afterPatch = (view: HistoryView, context: HistoryContext | undefined) => {
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

/**
 * Runs commits for a history: nested commits join the outermost, which reports what it changed, and where the view
 * was when it began, to `record`.
 */
export const createCommitter = (
  binding: Pick<HistoryBinding, 'store' | 'context'>,
  record: (change: VersionChange, context: HistoryContext, options: CommitOptions) => void,
): CanvasHistory['commit'] => {
  let depth = 0;
  return (change, options = {}) => {
    const context = depth === 0 ? binding.context() : undefined;
    depth++;
    let recorded: VersionChange | undefined;
    try {
      [recorded] = recordChanges([binding.store], change);
    } finally {
      depth--;
    }
    if (context && recorded) {
      record(recorded, context, options);
    }
    return recorded !== undefined;
  };
};

type LocalEntry = {
  change: VersionChange;
  context: HistoryContext;
  mergeKey?: string;
  updated: number;
};

/** A local history's undo and redo stacks; a host that keeps them across mounts keeps the history for the session. */
export type LocalHistoryStacks = { past: LocalEntry[]; future: LocalEntry[] };

export const createLocalStacks = (): LocalHistoryStacks => ({ past: [], future: [] });

export type LocalHistoryOptions = {
  /** Entries kept on each stack. */
  limit?: number;
  /** Milliseconds within which commits with one merge key fold together. */
  mergeWindow?: number;
  /** The clock merging reads; injectable for tests. */
  now?: () => number;
  /** The stacks to keep steps on; the host's own outlive the view, a fresh pair by default. */
  stacks?: LocalHistoryStacks;
};

const fold = (earlier: VersionChange, later: VersionChange): VersionChange => ({
  before: earlier.before,
  after: later.after,
  paths: unionPaths(earlier.paths, later.paths),
});

/** The history a canvas keeps for itself when its host has none: two stacks of patches in memory. */
export const createLocalHistory =
  ({ limit = 100, mergeWindow = 500, now = Date.now, stacks }: LocalHistoryOptions = {}): CreateHistory =>
  (binding) => {
    const { past, future } = stacks ?? createLocalStacks();
    // An entry may take later commits only until an undo or redo has stepped over it.
    let mergeable = false;
    const state = Atom.keepAlive(Atom.make<HistoryState>({ canUndo: false, canRedo: false }));
    const publish = () => binding.registry.set(state, { canUndo: past.length > 0, canRedo: future.length > 0 });
    // Kept stacks may already hold steps, which this view can undo.
    publish();

    const commit = createCommitter(binding, (change, context, { mergeKey }) => {
      const time = now();
      const last = past.at(-1);
      if (
        mergeable &&
        last &&
        mergeKey !== undefined &&
        last.mergeKey === mergeKey &&
        time - last.updated <= mergeWindow
      ) {
        last.change = fold(last.change, change);
        last.updated = time;
      } else {
        past.push({ change, context, mergeKey, updated: time });
        past.splice(0, Math.max(0, past.length - limit));
      }
      future.length = 0;
      mergeable = true;
      publish();
    });

    /** Moves the store from one end of `entry` to the other. */
    const step = ({ change, context }: LocalEntry, direction: 'undo' | 'redo') => {
      const [from, to] = direction === 'undo' ? [change.after, change.before] : [change.before, change.after];
      patchSource(binding.store, { from, to, paths: change.paths });
      afterPatch(binding.view, context);
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

/** A history for a view that edits nothing it should undo (a host that owns its side effects). */
export const noHistory: CreateHistory = (binding) => {
  const state = Atom.keepAlive(Atom.make<HistoryState>({ canUndo: false, canRedo: false }));
  return {
    commit: createCommitter(binding, () => {}),
    undo: () => false,
    redo: () => false,
    state,
    connect: () => () => {},
    view: binding.view,
  };
};
