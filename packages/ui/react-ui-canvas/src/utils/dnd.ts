//
// Copyright 2026 DXOS.org
//

//
// The drag payload a node type travels as between the palette (or a host's own draggable) and the
// canvas drop target (DESIGN.md §8 "external drag-in"); internal gestures stay pointer-driven.
//

import { type NodeType } from '../model/types.ts';

const NODE_DRAG_TYPE = 'dx-canvas/node';

/** The pragmatic-dnd data of a drag that creates a node of `type` where it drops. */
export const nodeDragData = (type: NodeType): Record<string, unknown> => ({ type: NODE_DRAG_TYPE, node: type });

/** The node type a drag carries, or nothing when the drag is not one of ours. */
export const nodeDragType = (data: Record<string | symbol, unknown>): NodeType | undefined =>
  data.type === NODE_DRAG_TYPE && typeof data.node === 'string' ? data.node : undefined;
