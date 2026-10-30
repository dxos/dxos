//
// Copyright 2026 DXOS.org
//

import { type MouseEvent, type PointerEvent, useCallback, useEffect, useMemo, useRef } from 'react';

import { type LinkId } from '@dxos/scene';

import { type CanvasAtoms, type NavigationCommands, type Projection } from '../../engine/index.ts';
import { type Capabilities, type Link, type Node, type NodeRegistry, type View, nodeDef } from '../../model/index.ts';
import { type PartKey, hitTest, partText, partValues } from '../../utils/index.ts';
import { type useRegistry } from '../useRegistry.ts';
import { SCENE_OVERLAY_ATTRIBUTE } from '../useWheel.ts';
import { type EditMode } from './useEditMode.ts';
import { type PointerMachine } from './usePointerMachine.ts';

/** How long a link stays hovered after the pointer leaves it, so the pointer can reach its end handles. */
const LINK_HOVER_GRACE_MS = 150;

export type ElementHandlers = {
  onNodePointerDown?: (node: Node, event: PointerEvent) => void;
  onLinkPointerDown?: (link: Link, event: PointerEvent) => void;
  onLinkDoubleClick?: (link: Link, event: MouseEvent) => void;
  onLinkContextMenu?: (link: Link, event: MouseEvent) => void;
  /** The in-place editor of `part` finished with `text` (commit) or was dismissed (cancel). */
  onPartCommit?: (node: Node, part: PartKey, text: string) => void;
  onPartCancel?: () => void;
  /** The pointer entered a link (its id) or left it (`undefined`). */
  onLinkHover?: (id: LinkId | undefined) => void;
  /** A node's own open control was pressed (a portal's zoom-in icon). */
  onNodeOpen?: (node: Node) => void;
};

export type UseElementHandlersOptions = {
  registry: ReturnType<typeof useRegistry>;
  atoms: CanvasAtoms;
  nodeRegistry: NodeRegistry;
  projection: Projection;
  capabilities: Capabilities;
  navigation: NavigationCommands;
  scene: View;
} & Pick<
  PointerMachine,
  'toScene' | 'onNodePointerDown' | 'onLinkPointerDown' | 'onLinkDoubleClick' | 'onLinkContextMenu'
> &
  Pick<EditMode, 'editNode'>;

/** The handlers the scene's elements call, and the root's double-click, which puts a node in edit mode or opens it. */
export const useElementHandlers = ({
  registry,
  atoms,
  nodeRegistry,
  projection,
  capabilities,
  navigation,
  scene,
  toScene,
  editNode,
  onNodePointerDown,
  onLinkPointerDown,
  onLinkDoubleClick,
  onLinkContextMenu,
}: UseElementHandlersOptions) => {
  const onPartCommit = useCallback(
    (node: Node, part: PartKey, text: string) => {
      registry.set(atoms.editing, undefined);
      const values = partValues(nodeRegistry, node, part, text);
      if (values && capabilities.update && text !== partText(nodeRegistry, node, part)) {
        projection.apply({ kind: 'update', id: node.id, values });
      }
    },
    [registry, atoms.editing, capabilities.update, projection, nodeRegistry],
  );
  const onPartCancel = useCallback(() => registry.set(atoms.editing, undefined), [registry, atoms.editing]);

  // Leaving a link waits a moment before it clears, so the pointer can reach the end handles drawn over it.
  const linkHoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onLinkHover = useCallback(
    (id: LinkId | undefined) => {
      clearTimeout(linkHoverTimer.current);
      if (id) {
        registry.set(atoms.linkHover, id);
      } else {
        linkHoverTimer.current = setTimeout(() => registry.set(atoms.linkHover, undefined), LINK_HOVER_GRACE_MS);
      }
    },
    [registry, atoms.linkHover],
  );
  useEffect(() => () => clearTimeout(linkHoverTimer.current), []);

  const handlers = useMemo<ElementHandlers>(
    () => ({
      onNodePointerDown,
      onLinkHover,
      onLinkPointerDown,
      onLinkDoubleClick,
      onLinkContextMenu,
      onPartCommit,
      onPartCancel,
      onNodeOpen: navigation.drillIn,
    }),
    [
      onNodePointerDown,
      onLinkHover,
      onLinkPointerDown,
      onLinkDoubleClick,
      onLinkContextMenu,
      onPartCommit,
      onPartCancel,
      navigation,
    ],
  );

  // Resolved at the root from the model: pointer capture during a drag retargets the click, so a
  // double-click never reaches the node element itself. A type with its own editor enters it wherever the node is
  // pressed; otherwise a text part under the pointer opens its editor;
  // the DOM is asked only which part, and the node comes from the model, so a part of a nested (live)
  // scene never matches the root node over it.
  const onDoubleClick = useCallback(
    (event: MouseEvent) => {
      const node = hitTest(scene, toScene(event));
      if (!node) {
        return;
      }
      const target = document.elementFromPoint(event.clientX, event.clientY);
      // A floating panel over the node took the clicks, so the node beneath is not the one meant; content embedded in
      // the node (an editor) keeps its own double-click (selecting a word).
      if (
        !(target instanceof Element) ||
        !target.closest('[data-node-id]') ||
        target.closest(`[${SCENE_OVERLAY_ATTRIBUTE}]`)
      ) {
        return;
      }
      if (nodeDef(nodeRegistry, node)?.editor === 'vertices') {
        editNode(node);
        return;
      }
      const partElement = target.closest('[data-part]');
      const part =
        partElement?.closest('[data-node-id]')?.getAttribute('data-node-id') === node.id
          ? (partElement?.getAttribute('data-part') ?? undefined)
          : undefined;
      if (part && editNode(node, part)) {
        return;
      }
      if (nodeDef(nodeRegistry, node)?.openable) {
        navigation.drillIn(node);
      }
    },
    [scene, toScene, nodeRegistry, navigation, editNode],
  );

  return { handlers, onDoubleClick };
};
