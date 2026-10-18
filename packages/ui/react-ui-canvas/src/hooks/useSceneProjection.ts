//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { useMemo } from 'react';

import {
  type CanvasAtoms,
  type FreehandProjectionOptions,
  type Projection,
  type SceneStore,
  createFreehandProjection,
} from '../model/index.ts';
import { withUndo } from '../utils/index.ts';
import { useRegistry } from './useRegistry.ts';

export type UseSceneProjectionOptions = {
  store: SceneStore;
  atoms: CanvasAtoms;
  createProjection?: (options: FreehandProjectionOptions) => Projection;
  /**
   * A host-owned projection, already obtained from this hook, used for every scene on the path: for a host
   * that owns one scene and its side effects and shares the projection with the view.
   */
  projection?: Projection;
};

/**
 * The projection of the scene at the head of the view's path, recording into the view's undo log;
 * shared by the view and its panels so every edit is undoable.
 */
export const useSceneProjection = ({
  store,
  atoms,
  createProjection = createFreehandProjection,
  projection,
}: UseSceneProjectionOptions): Projection => {
  const registry = useRegistry();
  const path = useAtomValue(atoms.path);
  const sceneId = path[path.length - 1];
  return useMemo(
    () =>
      projection ??
      withUndo(
        createProjection({
          registry,
          store,
          sceneId,
          // Snap lands on the lattice only while both snap and the lattice toggle are on.
          constrained: () => registry.get(atoms.snap) && registry.get(atoms.lattice),
        }),
        registry,
        atoms.undo,
        sceneId,
      ),
    [projection, createProjection, registry, store, sceneId, atoms.undo, atoms.snap, atoms.lattice],
  );
};
