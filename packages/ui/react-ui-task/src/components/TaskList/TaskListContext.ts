//
// Copyright 2026 DXOS.org
//

// Kept out of the components: react-refresh only fast-refreshes a module whose exports are all
// components, so a context exported beside one forces a full reload on every edit — and the edit
// pane, which lives in its own file, needs the same context the list provides.

import { createContext } from '@dxos/react-ui';
import { type MenuItem } from '@dxos/react-ui-menu';
import { type Task } from '@dxos/types';

import { type TaskPlacement } from './hierarchy.ts';
import { type TaskDescriptionProps } from './TaskDescription.tsx';
import { type TaskSelectModifiers } from './TaskTreeNode.tsx';

//
// Context — a plain `createContext` context from `@dxos/react-hooks` (un-scoped); nesting task lists has no meaning today.
//

const TASK_LIST_NAME = 'TaskList.Root';

export type TaskListContextValue = {
  tasks: readonly Task.Task[];
  groupByStatus: boolean;
  showGroupLabels: boolean;
  showOrdinals: boolean;
  showDescription: boolean;
  /** Renderers for a row's description beyond its own — a host's link anchor, say. */
  descriptionComponents?: TaskDescriptionProps['components'];
  /** Render each task's estimate beside the priority control. */
  showEstimates: boolean;
  /** Render the questions in each task's history under its title. */
  hierarchical: boolean;
  /** Paint the tree's drop bands on every row (development affordance). */
  debug: boolean;
  /** Whether the leading gutter is rendered at all — it holds the ordinal or the checkbox. */
  showGutter: boolean;
  /**
   * The row's column template, built once from the options so the tree's rows and the edit pane
   * lay out on the same named tracks (`gutter`, `status`, `title`, `chips`, `estimate`, `priority`,
   * `actions`).
   */
  gridTemplateColumns: string;
  selected?: string;
  /** Ids of the checked rows — the set an action acts on, distinct from the current row. */
  checked: ReadonlySet<string>;
  /** Whether a branch's sub-tasks are hidden, and the toggle that flips it. */
  isCollapsed: (id: string) => boolean;
  onCollapseToggle: (id: string) => void;
  /** Ids of the task being dragged and its sub-tasks — lifted out of the list for the drag's duration. */
  dragging: ReadonlySet<string>;
  onDraggingChange: (task: Task.Task | undefined) => void;
  onTaskCreate?: (task: Task.Draft) => void;
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
  getTaskActions?: (task: Task.Task) => MenuItem[];
  /** Selects a task, or clears the selection with `undefined`; defined only when the list is selectable. */
  onTaskSelect?: (task: Task.Task | undefined, modifiers?: TaskSelectModifiers) => void;
  /** Toggles a row's membership of the checked set; defined only when the host wired checkboxes. */
  onTaskCheck?: (task: Task.Task) => void;
  onTaskMove?: (task: Task.Task, placement: TaskPlacement) => void;
};

export const [TaskListProvider, useTaskListContext] = createContext<TaskListContextValue>(TASK_LIST_NAME);
