//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { useMemo } from 'react';

import {
  type CanvasAtoms,
  type CanvasHistory,
  type FreehandProjectionOptions,
  type Projection,
  createFreehandProjection,
  withHistory,
} from '../engine/index.ts';
import { type ViewStore } from '../model/index.ts';
import { useRegistry } from './useRegistry.ts';

export type UseViewProjectionOptions = {
  store: ViewStore;
  atoms: CanvasAtoms;
  createProjection?: (options: FreehandProjectionOptions) => Projection;
  /**
   * A host-owned projection, already obtained from this hook, used for every scene on the path: for a host
   * that owns one scene and its side effects and shares the projection with the view.
   */
  projection?: Projection;
  /** Each intent is one of its undo steps. */
  history: Pick<CanvasHistory, 'commit'>;
};

/**
 * The projection of the scene at the head of the view's path, each intent a commit of the view's history; shared by
 * the view and its panels so every edit is undoable. A host-owned projection is used as given.
 */
export const useViewProjection = ({
  store,
  atoms,
  createProjection = createFreehandProjection,
  projection,
  history,
}: UseViewProjectionOptions): Projection => {
  const registry = useRegistry();
  const path = useAtomValue(atoms.path);
  const sceneId = path[path.length - 1];
  return useMemo(
    () =>
      projection ??
      withHistory(
        createProjection({
          registry,
          store,
          sceneId,
          // On a lattice scene, snap lands on the lattice's cells.
          constrained: () => registry.get(atoms.snap),
        }),
        history,
      ),
    [projection, createProjection, registry, store, sceneId, history, atoms.snap],
  );
};
