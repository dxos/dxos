//
// Copyright 2026 DXOS.org
//

import { type Instruction, type ItemMode } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';

import { type TaskDropIntent } from './hierarchy.ts';

/**
 * Drag payload for a task row. Tagged so a drop target can tell a task from any other draggable
 * sharing the page (the navtree, a mosaic tile) rather than reading a bare `id` off it.
 */
export const TASK_DRAG_TYPE = 'dxos/task';

export type TaskDragData = {
  type: typeof TASK_DRAG_TYPE;
  taskId: string;
};

export const isTaskDragData = (data: Record<string | symbol, unknown>): data is TaskDragData =>
  data.type === TASK_DRAG_TYPE && typeof data.taskId === 'string';

/** Indentation per level, matching the navtree so the two trees step identically. */
export const INDENT_PER_LEVEL = 8;

/**
 * The hitbox's item mode, which decides where its bands sit: the last row of a group gets a
 * shallower `reorder-below` band (there is nothing beneath it to reorder against), and an expanded
 * branch gets none at all — below it is its own first child.
 */
export const itemMode = ({ branch, open, last }: { branch: boolean; open: boolean; last: boolean }): ItemMode =>
  branch && open ? 'expanded' : last ? 'last-in-group' : 'standard';

/** The drop intent an instruction expresses, or undefined when it carries none (blocked). */
export const dropIntent = (instruction: Instruction | null): TaskDropIntent | undefined => {
  switch (instruction?.type) {
    case 'reorder-above':
    case 'reorder-below':
    case 'make-child':
      return instruction.type;
    default:
      // `reparent` (dropping past the end of a branch onto an outer level) is not offered: the list
      // has no gutter to aim at, and `make-child` plus a nudge expresses the same move.
      return undefined;
  }
};
