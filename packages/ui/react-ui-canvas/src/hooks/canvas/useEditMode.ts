//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { type CanvasAtoms } from '../../engine/index.ts';
import {
  type Capabilities,
  type ElementId,
  type Node,
  type NodeId,
  type NodeRegistry,
  nodeDef,
} from '../../model/index.ts';
import { type PartKey, hasVertices, nodeParts, partText } from '../../utils/index.ts';
import { type useRegistry } from '../useRegistry.ts';

export type UseEditModeOptions = {
  registry: ReturnType<typeof useRegistry>;
  atoms: CanvasAtoms;
  nodeRegistry: NodeRegistry;
  capabilities: Capabilities;
  select: (ids: Iterable<ElementId>) => void;
};

export type EditMode = {
  /**
   * Puts `node` in edit mode (`NodeDef.editor`), selected alone: its vertices, or its text `part` in place (the first
   * when none is named). False when the node has nothing to edit, or the view may not update it.
   */
  editNode: (node: Node, part?: PartKey) => boolean;
  /**
   * Leaves a vertex edit mode, unless it is `keep`'s: each drag has already landed, so there is nothing to commit. A text
   * part's editor leaves on its own (Enter, Escape, or the focus loss a press outside it causes).
   */
  exitEdit: (keep?: NodeId) => void;
};

/** Enters and leaves the one node edit mode the view has (`CanvasAtoms.editing`). */
export const useEditMode = ({ registry, atoms, nodeRegistry, capabilities, select }: UseEditModeOptions): EditMode => {
  const editNode = useCallback(
    (node: Node, part?: PartKey) => {
      if (!capabilities.update) {
        return false;
      }
      if (nodeDef(nodeRegistry, node)?.editor === 'vertices') {
        if (node.locked || !hasVertices(node)) {
          return false;
        }
        select([node.id]);
        // Entering again keeps the vertex last pressed, so a double-click inside the mode stays in it unchanged.
        if (registry.get(atoms.editing)?.id !== node.id) {
          registry.set(atoms.editing, { id: node.id, kind: 'vertices' });
        }
        return true;
      }
      const field = part ?? nodeParts(nodeRegistry, node)[0]?.field;
      if (field === undefined || partText(nodeRegistry, node, field) === undefined) {
        return false;
      }
      select([node.id]);
      registry.set(atoms.editing, { id: node.id, kind: 'label', part: field });
      return true;
    },
    [capabilities.update, nodeRegistry, select, registry, atoms.editing],
  );

  const exitEdit = useCallback(
    (keep?: NodeId) => {
      const editing = registry.get(atoms.editing);
      if (editing?.kind === 'vertices' && editing.id !== keep) {
        registry.set(atoms.editing, undefined);
      }
    },
    [registry, atoms.editing],
  );

  return { editNode, exitEdit };
};
