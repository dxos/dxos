//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { useMemo } from 'react';

import { type ViewId } from '@dxos/scene';

import {
  type CanvasAtoms,
  type CanvasHistory,
  type DrawScene,
  createDrawScene,
  freehandCapabilities,
  intersectCapabilities,
  latticeCapabilities,
  withHistory,
} from '../engine/index.ts';
import { type Capabilities, type ViewStore } from '../model/index.ts';
import { type LatticeSpec, type SceneEdit } from '../utils/index.ts';
import { useRegistry } from './useRegistry.ts';

export type UseDrawSceneOptions = {
  store: ViewStore;
  atoms: CanvasAtoms;
  /** What a person may do, within what the layout allows; everything it allows when unset. */
  capabilities?: Capabilities;
  /** What the layout's mode would make of an edit to scene `sceneId`, for previews; edits stand as given when unset. */
  constrain?: (sceneId: ViewId, edit: SceneEdit) => SceneEdit | undefined;
  /** The lattice of each scene's layout, if it has one. */
  lattice?: (sceneId: ViewId) => LatticeSpec | undefined;
  /** Each edit is one of its undo steps. */
  history: Pick<CanvasHistory, 'commit'>;
};

/**
 * The scene at the head of the view's path, each edit a commit of the view's history; shared by the view and its
 * panels so every edit is undoable.
 */
export const useDrawScene = ({
  store,
  atoms,
  capabilities,
  constrain,
  lattice,
  history,
}: UseDrawSceneOptions): DrawScene => {
  const registry = useRegistry();
  const path = useAtomValue(atoms.path);
  const sceneId = path[path.length - 1];
  const spec = lattice?.(sceneId);
  const key = JSON.stringify(spec);
  return useMemo(() => {
    const allowed = spec ? latticeCapabilities : freehandCapabilities;
    return withHistory(
      createDrawScene({
        registry,
        store,
        sceneId,
        capabilities: capabilities ? intersectCapabilities(allowed, capabilities) : allowed,
        constrain: constrain && ((edit) => constrain(sceneId, edit)),
        lattice: spec,
      }),
      history,
    );
  }, [registry, store, sceneId, capabilities, constrain, key, history]);
};
