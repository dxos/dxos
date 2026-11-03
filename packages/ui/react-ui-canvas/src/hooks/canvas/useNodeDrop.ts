//
// Copyright 2026 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { type RefObject, useEffect, useRef } from 'react';

import { type NodeType } from '@dxos/scene';

import { type Drag } from '../../engine/index.ts';
import { type Capabilities, type NodeRegistry } from '../../model/index.ts';
import { nodeDragType, nominalSize } from '../../utils/index.ts';
import { type PointerMachine } from './usePointerMachine.ts';

export type UseNodeDropOptions = {
  rootRef: RefObject<HTMLDivElement | null>;
  capabilities: Capabilities;
  nodeRegistry: NodeRegistry;
  /** Scene px of one nominal unit (the model's major grid cell), which a new node's default size is counted in. */
  cell: number;
  snapMinor: (value: number) => number;
} & Pick<PointerMachine, 'toScene' | 'setDrag' | 'cancelDrag' | 'onPointerUp'>;

/** Makes the canvas a drop target for node types dragged in from the palette or a host's draggable. */
export const useNodeDrop = ({
  rootRef,
  capabilities,
  nodeRegistry,
  cell,
  toScene,
  snapMinor,
  setDrag,
  cancelDrag,
  onPointerUp,
}: UseNodeDropOptions) => {
  // A node type dragged in (from the palette or a host's draggable) previews as a create drag would and
  // lands through the same drop, so what the ghost shows is what is created.
  const onPointerUpRef = useRef(onPointerUp);
  onPointerUpRef.current = onPointerUp;
  useEffect(() => {
    const element = rootRef.current;
    if (!element) {
      return;
    }
    // The pointer is the shape's centre; its top-left snaps to the minor grid, so the shape lands where it
    // was dropped rather than up to half a major cell away.
    const dragAt = (type: NodeType, input: { clientX: number; clientY: number }): Drag => {
      const point = toScene(input);
      const def = nodeRegistry[type];
      const size = def ? nominalSize(def.defaultSize, cell) : { width: 0, height: 0 };
      const from = { x: snapMinor(point.x - size.width / 2), y: snapMinor(point.y - size.height / 2) };
      return { kind: 'create', type, from, to: from, dropped: true };
    };
    return dropTargetForElements({
      element,
      canDrop: ({ source }) => capabilities.create === true && nodeDragType(source.data) !== undefined,
      onDragEnter: ({ source, location }) => {
        const type = nodeDragType(source.data);
        if (type !== undefined) {
          setDrag(dragAt(type, location.current.input));
        }
      },
      onDrag: ({ source, location }) => {
        const type = nodeDragType(source.data);
        if (type !== undefined) {
          setDrag(dragAt(type, location.current.input));
        }
      },
      onDragLeave: cancelDrag,
      // Placed where it is released: the last drag-over can lag the pointer by a step.
      onDrop: ({ source, location }) => {
        const type = nodeDragType(source.data);
        if (type !== undefined) {
          setDrag(dragAt(type, location.current.input));
        }
        onPointerUpRef.current();
      },
    });
  }, [capabilities.create, nodeRegistry, cell, toScene, snapMinor, setDrag, cancelDrag]);
};
