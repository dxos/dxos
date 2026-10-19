//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo, useRef } from 'react';

import { type CanvasAtoms, type Projection } from '../../engine/index.ts';
import {
  type Capabilities,
  type ElementId,
  type NodeRegistry,
  type NodeType,
  type SceneId,
  type SceneStore,
  type Size,
} from '../../model/index.ts';
import { createId, nominalSize, redo, screenToScene, undo } from '../../utils/index.ts';
import { type useRegistry } from '../useRegistry.ts';
import { type PointerMachine } from './usePointerMachine.ts';

/** The document edits the toolbars offer beyond the controller's: history, creation at the view's centre, auto layout. */
export type DocumentCommands = {
  undo: () => void;
  redo: () => void;
  /** A default-sized node of `type` centred in the view, its top-left on the grid. */
  create: (type: NodeType) => void;
  /** Lays out the selection of two or more, else the board. */
  layout: () => void;
};

export type UseDocumentCommandsOptions = {
  registry: ReturnType<typeof useRegistry>;
  atoms: CanvasAtoms;
  store: SceneStore;
  projection: Projection;
  readonly: boolean;
  sceneId: SceneId;
  select: (ids: Iterable<ElementId>) => void;
  nodeRegistry: NodeRegistry;
  capabilities: Capabilities;
  /** Scene px of one nominal unit (the model's major grid cell), which a new node's default size is counted in. */
  cell: number;
  viewport: Size;
  snapMinor: (value: number) => number;
} & Pick<PointerMachine, 'createdNode' | 'commitCreated'>;

/** The document commands, stable for the life of the canvas: each reads the view as it is when it runs. */
export const useDocumentCommands = ({
  registry,
  atoms,
  store,
  projection,
  readonly,
  sceneId,
  select,
  nodeRegistry,
  capabilities,
  cell,
  viewport,
  snapMinor,
  createdNode,
  commitCreated,
}: UseDocumentCommandsOptions): DocumentCommands => {
  // Undo restores a whole model snapshot, so the selection may name elements that no longer exist.
  const onUndo = useCallback(() => {
    if (!readonly && undo(projection, registry, atoms.undo, sceneId, store)) {
      select([]);
    }
  }, [readonly, projection, registry, atoms.undo, sceneId, store, select]);
  const onRedo = useCallback(() => {
    if (!readonly && redo(projection, registry, atoms.undo, sceneId, store)) {
      select([]);
    }
  }, [readonly, projection, registry, atoms.undo, sceneId, store, select]);

  const createAtCentre = (type: NodeType) => {
    const def = nodeRegistry[type];
    if (!def || !capabilities.create) {
      return;
    }
    const size = nominalSize(def.defaultSize, cell);
    const centre = screenToScene(registry.get(atoms.camera), { x: viewport.width / 2, y: viewport.height / 2 });
    const from = { x: snapMinor(centre.x - size.width / 2), y: snapMinor(centre.y - size.height / 2) };
    // `dropped`: there is no drawn box, so the type's default size applies, as for a palette drop.
    const node = createdNode({ kind: 'create', type, from, to: from, dropped: true }, createId(type));
    if (node) {
      commitCreated(node);
    }
  };

  // Read when a command runs, so the commands keep their identity while the view moves and the scene is edited.
  const latestRef = useRef({ onUndo, onRedo, createAtCentre, projection });
  latestRef.current = { onUndo, onRedo, createAtCentre, projection };
  return useMemo<DocumentCommands>(
    () => ({
      undo: () => latestRef.current.onUndo(),
      redo: () => latestRef.current.onRedo(),
      create: (type) => latestRef.current.createAtCentre(type),
      // A selection of two or more is what the user asked to tidy; one node alone means the board.
      layout: () => {
        const selection = registry.get(atoms.selection);
        latestRef.current.projection.apply({ kind: 'layout', ids: selection.size > 1 ? [...selection] : undefined });
      },
    }),
    [registry, atoms.selection],
  );
};
