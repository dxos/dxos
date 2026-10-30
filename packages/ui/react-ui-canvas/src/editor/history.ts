//
// Copyright 2026 DXOS.org
//

import { type Scene } from '@dxos/scene';

import { type LocalHistoryStacks, createLocalStacks } from '../engine/index.ts';
import { type VersionChange, type VersionedSource, patchSource, recordChanges } from '../model/index.ts';

/** A model edit (group, ungroup, make object) as the documents before and after it, undone by writing back the first. */
export type DocumentStep = { kind: 'document'; before: Scene.SceneDocument; after: Scene.SceneDocument };

/** One undo step: a change to the layouts' fields, or a whole model edit. */
export type HistoryStep = VersionChange | DocumentStep;

export const isDocumentStep = (step: HistoryStep): step is DocumentStep => 'kind' in step && step.kind === 'document';

/** A canvas's undo and redo steps. */
export type SessionHistory = { done: HistoryStep[]; undone: HistoryStep[] };

const histories = new WeakMap<object, SessionHistory>();

/**
 * The undo history of a canvas for this session: it outlives the editor that shows the canvas, so closing and reopening
 * it keeps the steps, but it is not persisted.
 */
export const sessionHistory = (canvas: object): SessionHistory => {
  let history = histories.get(canvas);
  if (!history) {
    history = { done: [], undone: [] };
    histories.set(canvas, history);
  }
  return history;
};

const stacks = new WeakMap<object, LocalHistoryStacks>();

/** The 2D engine's undo stacks for a canvas this session, so reopening its editor keeps the steps. */
export const sessionStacks = (canvas: object): LocalHistoryStacks => {
  let kept = stacks.get(canvas);
  if (!kept) {
    kept = createLocalStacks();
    stacks.set(canvas, kept);
  }
  return kept;
};

export type HistoryOptions = {
  /** The steps, kept by the host (e.g. `sessionHistory(canvas)`). */
  steps: SessionHistory;
  /** The layouts' fields, read back at a step's heads. */
  source: VersionedSource;
  /** Writes a whole document back, for a model edit's step. */
  writeDocument?: (document: Scene.SceneDocument) => void;
  /** Called after every change to the stacks. */
  onChange?: () => void;
};

/** The editor's undo and redo over a canvas: field-level, so undoing never overwrites a peer's later edit. */
export type History = {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** Runs `change` and records what it wrote to the source as one step; false when it wrote nothing. */
  record: (change: () => void) => boolean;
  /** Records a model edit as one step. */
  recordDocument: (before: Scene.SceneDocument, after: Scene.SceneDocument) => void;
  undo: () => void;
  redo: () => void;
};

/**
 * Undo and redo as inverse patches: a step keeps its source's heads either side and the paths it wrote, and undoing
 * moves each path back only if it still holds the step's value, so a peer's edit to another field (or the same one,
 * since) survives (Review Focus 3).
 */
export const createHistory = ({ steps, source, writeDocument, onChange }: HistoryOptions): History => {
  const push = (step: HistoryStep) => {
    steps.done.push(step);
    steps.undone.length = 0;
    onChange?.();
  };
  const move = (direction: 'undo' | 'redo') => {
    const from = direction === 'undo' ? steps.done : steps.undone;
    const to = direction === 'undo' ? steps.undone : steps.done;
    const step = from.pop();
    if (!step) {
      return;
    }
    if (isDocumentStep(step)) {
      writeDocument?.(direction === 'undo' ? step.before : step.after);
    } else {
      patchSource(source, {
        from: direction === 'undo' ? step.after : step.before,
        to: direction === 'undo' ? step.before : step.after,
        paths: step.paths,
      });
    }
    to.push(step);
    onChange?.();
  };
  return {
    get canUndo() {
      return steps.done.length > 0;
    },
    get canRedo() {
      return steps.undone.length > 0;
    },
    record: (change) => {
      const [step] = recordChanges([source], change);
      step && push(step);
      return step !== undefined;
    },
    recordDocument: (before, after) => push({ kind: 'document', before, after }),
    undo: () => move('undo'),
    redo: () => move('redo'),
  };
};
