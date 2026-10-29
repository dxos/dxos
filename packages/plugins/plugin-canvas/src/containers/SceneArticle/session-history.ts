//
// Copyright 2026 DXOS.org
//

import { type VersionChange } from '@dxos/react-ui-canvas/headless';
import { type Scene } from '@dxos/scene';

/** A model edit (Make object) as the canvas documents before and after it, undone by writing back the first. */
export type DocumentStep = { kind: 'document'; before: Scene.SceneDocument; after: Scene.SceneDocument };

/** One undo step: a change to the layouts' fields, or a whole model edit. */
export type HistoryStep = VersionChange | DocumentStep;

export const isDocumentStep = (step: HistoryStep): step is DocumentStep => 'kind' in step && step.kind === 'document';

/** A canvas's undo and redo steps. */
export type SessionHistory = { done: HistoryStep[]; undone: HistoryStep[] };

const histories = new WeakMap<object, SessionHistory>();

/**
 * The undo history of a canvas for this session: it outlives the article that shows the canvas, so closing and
 * reopening it keeps the steps, but it is not persisted.
 */
export const sessionHistory = (canvas: object): SessionHistory => {
  let history = histories.get(canvas);
  if (!history) {
    history = { done: [], undone: [] };
    histories.set(canvas, history);
  }
  return history;
};
