//
// Copyright 2026 DXOS.org
//

import { type VersionChange } from '@dxos/react-ui-canvas/headless';

/** A canvas's undo and redo steps. */
export type SessionHistory = { done: VersionChange[]; undone: VersionChange[] };

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
