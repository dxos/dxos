//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { useMemo } from 'react';

import { type SceneViewAtoms } from '../model/atoms.ts';
import { type FreehandProjectionOptions, type Projection, createFreehandProjection } from '../model/projection.ts';
import { type SceneStore } from '../model/store.ts';
import { withUndo } from '../utils/undo.ts';
import { useRegistry } from './useRegistry.ts';

export type UseSceneProjectionOptions = {
  store: SceneStore;
  atoms: SceneViewAtoms;
  createProjection?: (options: FreehandProjectionOptions) => Projection;
};

/**
 * The projection of the scene at the head of the view's path, recording into the view's undo log;
 * shared by the view and its panels so every edit is undoable.
 */
export const useSceneProjection = ({
  store,
  atoms,
  createProjection = createFreehandProjection,
}: UseSceneProjectionOptions): Projection => {
  const registry = useRegistry();
  const path = useAtomValue(atoms.path);
  const sceneId = path[path.length - 1];
  return useMemo(
    () => withUndo(createProjection({ registry, store, sceneId }), registry, atoms.undo, sceneId),
    [createProjection, registry, store, sceneId, atoms.undo],
  );
};
