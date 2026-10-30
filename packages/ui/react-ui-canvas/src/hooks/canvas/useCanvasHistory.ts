//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { type CanvasAtoms, type CanvasHistory, type CreateHistory, createLocalHistory } from '../../engine/index.ts';
import { type ViewStore, storeVersions } from '../../model/index.ts';
import { type useRegistry } from '../useRegistry.ts';

export type UseCanvasHistoryOptions = {
  registry: ReturnType<typeof useRegistry>;
  atoms: CanvasAtoms;
  store: ViewStore;
  /** The host's history (Composer's tracker); a local one by default. */
  history?: CreateHistory;
};

/**
 * A view's undo history, made once per store and atoms. `Canvas.Root` makes its own unless given one; a host that
 * edits the view's model from outside it (its own panels over a shared scene) makes it here and passes it to both.
 */
export const useCanvasHistory = ({ registry, atoms, store, history: createHistory }: UseCanvasHistoryOptions) => {
  const history = useMemo<CanvasHistory>(
    () =>
      (createHistory ?? createLocalHistory())({
        registry,
        store: storeVersions(registry, store),
        context: () => {
          const isolation = registry.get(atoms.isolation);
          return {
            path: registry.get(atoms.path),
            selection: [...registry.get(atoms.selection)],
            ...(isolation ? { isolate: isolation.composite } : {}),
          };
        },
        view: {},
      }),
    [registry, atoms, store, createHistory],
  );
  // Connected in an effect, so a strict-mode remount reconnects to the host's history rather than staying cut off.
  useEffect(() => history.connect(), [history]);
  return history;
};
