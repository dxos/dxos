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
  type DrawState,
  createDrawScene,
  createInsideScene,
  freehandCapabilities,
  intersectCapabilities,
  latticeCapabilities,
  withHistory,
} from '../engine/index.ts';
import { type Capabilities, type NodeRegistry } from '../model/index.ts';
import { type LatticeSpec, type SceneEdit } from '../utils/index.ts';
import { useRegistry } from './useRegistry.ts';

export type UseDrawSceneOptions = {
  store: DrawState;
  atoms: CanvasAtoms;
  /** What a person may do, within what the layout allows; everything it allows when unset. */
  capabilities?: Capabilities;
  /** What the layout's mode would make of an edit to scene `sceneId`, for previews; edits stand as given when unset. */
  constrain?: (sceneId: ViewId, edit: SceneEdit) => SceneEdit | undefined;
  /** The lattice of each scene's layout, if it has one. */
  lattice?: (sceneId: ViewId) => LatticeSpec | undefined;
  /** Each edit is one of its undo steps. */
  history: Pick<CanvasHistory, 'commit'>;
  /** The node types, which decide which of a part's fields are its text (and so the Instance's, not the definition's). */
  nodeRegistry: NodeRegistry;
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
  nodeRegistry,
}: UseDrawSceneOptions): DrawScene => {
  const registry = useRegistry();
  const path = useAtomValue(atoms.path);
  const sceneId = path[path.length - 1];
  const inside = useAtomValue(atoms.inside);
  const spec = lattice?.(sceneId);
  const key = JSON.stringify(spec);
  return useMemo(() => {
    const allowed = spec ? latticeCapabilities : freehandCapabilities;
    const base = createDrawScene({
      registry,
      store,
      sceneId,
      capabilities: capabilities ? intersectCapabilities(allowed, capabilities) : allowed,
      constrain: constrain && ((edit) => constrain(sceneId, edit)),
      lattice: spec,
    });
    // History wraps the Object's scene too, so entering one, editing a part and undoing is one step like any other.
    return withHistory(
      inside ? createInsideScene({ registry, store, outer: base, inside, nodeRegistry }) : base,
      history,
    );
  }, [registry, store, sceneId, capabilities, constrain, key, history, inside, nodeRegistry]);
};
