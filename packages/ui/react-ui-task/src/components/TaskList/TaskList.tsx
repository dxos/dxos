//
// Copyright 2026 DXOS.org
//

import {
  type Instruction,
  attachInstruction,
  extractInstruction,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import React, {
  type CSSProperties,
  Fragment,
  type KeyboardEvent,
  type MouseEvent,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import {
  Button,
  DxAnchorActivate,
  Icon,
  IconBlock,
  IconButton,
  IconButtonProps,
  Input,
  Tag,
  Toolbar,
  composable,
  composableProps,
  toLocalizedString,
  useTranslation,
} from '@dxos/react-ui';
import { Listbox, TreeDropIndicator, TreeItemToggle, paddingIndentation, useListDisclosure } from '@dxos/react-ui-list';
import { MarkdownEditable, type MarkdownEditableController } from '@dxos/react-ui-markdown';
import {
  Menu,
  type MenuAction,
  type MenuItem,
  createMenuAction,
  executeMenuAction,
  fallbackIcon,
} from '@dxos/react-ui-menu';
import { type Actor, Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { INDENT_PER_LEVEL, TASK_DRAG_TYPE, type TaskDragData, dropIntent, isTaskDragData, itemMode } from './dnd';
import {
  type TaskPlacement,
  type TaskTreeRow,
  resolveIndent,
  resolveNudge,
  resolveOutdent,
  resolveTaskPlacement,
  subtreeIds,
  walkTaskTree,
} from './hierarchy';
import { STATUS_ICONS } from './status-icons';
import { TaskDescription } from './TaskDescription';
import { TaskTreeContent } from './TaskTreeContent';
import { type TaskNode } from './tree-model';

const TASK_LIST_NAME = 'TaskList.Root';

/** Linear-style status groups, most active first. */
export const STATUS_ORDER: Task.Status[] = ['started', 'review', 'todo', 'done', 'failed', 'cancelled'];

//
// Context — plain Radix context (un-scoped); nesting task lists has no meaning today.
//

type TaskListContextValue = {
  tasks: readonly Task.Task[];
  groupByStatus: boolean;
  showGroupLabels: boolean;
  showOrdinals: boolean;
  showDescription: boolean;
  /** Render each task's estimate beside the priority control. */
  showEstimates: boolean;
  hierarchical: boolean;
  /** Paint the tree's drop bands on every row (development affordance). */
  debug: boolean;
  /** Whether the leading gutter is rendered at all — it holds the ordinal and the drag handle. */
  showGutter: boolean;
  selected?: string;
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
  onTaskSelect?: (task: Task.Task | undefined) => void;
  onTaskMove?: (task: Task.Task, placement: TaskPlacement) => void;
};

const [TaskListProvider, useTaskListContext] = createContext<TaskListContextValue>(TASK_LIST_NAME);

/** Shared empty set, so a list with nothing in flight does not allocate one per render. */
const EMPTY_IDS: ReadonlySet<string> = new Set<string>();

/** Shared empty map, for a tree rendered without the ordinal gutter. */
const EMPTY_ORDINALS: ReadonlyMap<string, number> = new Map<string, number>();

//
// Root — headless context provider. Renders no DOM.
//

type TaskListRootProps = PropsWithChildren<{
  tasks: readonly Task.Task[];
  /** Group rows into status sections (Linear order); flat list otherwise. */
  groupByStatus?: boolean;
  /** Render the status heading above each group; grouping order is kept either way. */
  showGroupLabels?: boolean;
  /** Number rows 1..N down the list as rendered, so tasks can be referenced by ordinal. */
  showOrdinals?: boolean;
  /** Render each task's estimate beside the priority control. Off by default. */
  showEstimates?: boolean;
  /** Render each task's description under its title; rows grow to fit. Off by default, so a
   * single-line list (e.g. the chat strip) keeps one row per task. */
  showDescription?: boolean;
  /** Enables `Create`; called with a draft carrying at least the trimmed title. */
  onTaskCreate?: (task: Task.Draft) => void;
  /** Enables the done toggle. Every mutation is delegated — the list never writes. */
  onTaskUpdate?: (task: Task.Task, patch: Task.Edit) => void;
  /**
   * Trailing menu for a row. One item renders as a plain icon button, several as a `…` menu, none as
   * nothing — so delete is an ordinary contributed action rather than a special case of its own.
   */
  getTaskActions?: (task: Task.Task) => MenuItem[];
  /**
   * Row click, and `Escape` — which passes `undefined`, since a reader needs a way back out of a
   * selection. Wiring it (or `selected`) makes the list selectable, so the row shows as selected.
   */
  onTaskSelect?: (task: Task.Task | undefined) => void;
  /** Selected task id (controlled); omit to let the list track the last row clicked. */
  selected?: string;
  /**
   * Makes the list selectable without a controlled `selected` or an `onTaskSelect` — for a host
   * whose selection consumers (e.g. `Edit`) live inside the list's own context.
   */
  selectable?: boolean;
  /**
   * Render the set as the tree it stores (`Task.parentTask`), not as status groups — the two are
   * mutually exclusive, since a tree regrouped by status is no longer a tree.
   */
  hierarchical?: boolean;
  /** Paint the tree's drop bands on every row (development affordance). */
  debug?: boolean;
  /**
   * Enables restructuring by drag and by keyboard; called with the one move the gesture means.
   * `MoveTask` takes exactly this pair, so a drop is a single mutation rather than a re-parent
   * followed by a reposition.
   */
  onTaskMove?: (task: Task.Task, placement: TaskPlacement) => void;
  /**
   * Ids of the branches whose sub-tasks are hidden (controlled). Collapsed rather than expanded
   * ids, because a branch is open by default: tracking the expanded set would render a task's new
   * first sub-task hidden, the moment adding it made its parent a branch. Per viewer and per list —
   * a collapsed branch is not a property of the work — so this is state, not stored on the object.
   */
  collapsed?: ReadonlySet<string>;
  onCollapsedChange?: (collapsed: ReadonlySet<string>) => void;
}>;

const TaskListRoot = ({
  children,
  tasks,
  groupByStatus = true,
  showGroupLabels = true,
  showOrdinals = false,
  showDescription = false,
  showEstimates = false,
  hierarchical = false,
  debug = false,
  collapsed,
  selected: selectedProp,
  selectable: selectableProp,
  onTaskCreate,
  onTaskUpdate,
  getTaskActions,
  onTaskSelect,
  onTaskMove,
  onCollapsedChange,
}: TaskListRootProps) => {
  // Uncontrolled by default: a host that only wants the click callback still gets the selected
  // styling, and one that owns the selection passes `selected`.
  const [selectedState, setSelectedState] = useState<string | undefined>(selectedProp);
  const selected = selectedProp ?? selectedState;
  const selectable = selectableProp ?? (!!onTaskSelect || selectedProp !== undefined);

  const handleValueChange = useCallback(
    (id: string) => {
      setSelectedState(id);
      const task = tasks.find((task) => task.id === id);
      if (task) {
        onTaskSelect?.(task);
      }
    },
    [tasks, onTaskSelect],
  );

  // Passing `undefined` clears the selection — what `Escape` on a row and the edit pane's buttons do.
  const handleSelect = useCallback(
    (task: Task.Task | undefined) => {
      setSelectedState(task?.id);
      onTaskSelect?.(task);
    },
    [onTaskSelect],
  );

  // The hook owns the controlled/uncontrolled Set state machine; its trigger/panel ids are not
  // used, because a sub-task is a sibling row in the same grid rather than a region the toggle
  // could point `aria-controls` at — `aria-expanded` on the row carries the disclosure instead.
  const disclosure = useListDisclosure({
    mode: 'multi',
    ...(collapsed !== undefined || onCollapsedChange ? { value: collapsed } : {}),
    defaultValue: new Set<string>(),
    onValueChange: onCollapsedChange,
  });
  const isCollapsed = useCallback((id: string) => disclosure.bind(id).expanded, [disclosure]);
  const onCollapseToggle = useCallback((id: string) => disclosure.bind(id).toggle(), [disclosure]);

  // A dragged task leaves the list while it is in flight — it is in the reader's hand, shown in the
  // drag preview — so the rows close up over the gap it came from. Its sub-tasks go with it: they
  // travel with their parent and are part of the same preview.
  const [draggingTask, setDraggingTask] = useState<Task.Task>();
  const dragging = useMemo(() => (draggingTask ? subtreeIds(tasks, draggingTask) : EMPTY_IDS), [tasks, draggingTask]);

  return (
    <TaskListProvider
      tasks={tasks}
      // Not gated on `!hierarchical` any more: the tree expresses a status group as a `group` node,
      // so grouping and hierarchy are a choice rather than mutually exclusive capabilities.
      groupByStatus={groupByStatus}
      showGroupLabels={showGroupLabels}
      showOrdinals={showOrdinals}
      showDescription={showDescription}
      showEstimates={showEstimates}
      hierarchical={hierarchical}
      debug={debug}
      // The handle lives in the ordinal's gutter, so a movable list reserves the track even when it
      // shows no numbers.
      showGutter={showOrdinals || !!onTaskMove}
      isCollapsed={isCollapsed}
      selected={selected}
      dragging={dragging}
      onDraggingChange={setDraggingTask}
      onCollapseToggle={onCollapseToggle}
      onTaskCreate={onTaskCreate}
      onTaskUpdate={onTaskUpdate}
      getTaskActions={getTaskActions}
      onTaskSelect={selectable ? handleSelect : undefined}
      onTaskMove={onTaskMove}
    >
      {/* Both roots are headless, so the pair renders no DOM of its own. */}
      <Listbox.Root {...(selectable ? { value: selected, onValueChange: handleValueChange } : {})}>
        {children}
      </Listbox.Root>
    </TaskListProvider>
  );
};

TaskListRoot.displayName = 'TaskList.Root';

//
// Viewport — the scrolling region (the listbox's own viewport). `Create` sits outside it, so the
// add row stays pinned while the rows scroll.
//

type TaskListViewportProps = ComposableProps;

const TaskListViewport = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  return (
    <Listbox.Viewport {...rest} classNames={mx('dx-shrink', className)} ref={forwardedRef}>
      {children}
    </Listbox.Viewport>
  );
});

TaskListViewport.displayName = 'TaskList.Viewport';

//
// Content — the rows, grouped by status when the root says so.
//

/**
 * The rows and the create row are separate grids (the create row sits outside the scrolling
 * viewport), so their leading gutters — ordinal, then status — are declared once here: only
 * matching templates keep the `+` under the status control and the input under the titles.
 * Tailwind scans for whole class names, hence four literals rather than a composed prefix. The
 * status gutter is `1.5rem` because that is the width of the `density='sm'` icon button it holds;
 * a narrower track makes the button overflow it and align left instead of centring.
 */
/** Ordinals stop at 99: the gutter is sized for two digits. */
const MAX_ORDINAL = 99;

/**
 * The edit pane's columns. The leading `1.5rem` stands in for the row's disclosure toggle, which
 * the pane has no use for but must reserve: without it every row sits a toggle's width to the right
 * of the pane and the two read as different grids.
 */
const GRID_COLS = {
  content: 'grid-cols-[1.5rem_1.5rem_1fr_min-content_2rem]',
  contentWithOrdinals: 'grid-cols-[1.5rem_2rem_1.5rem_1fr_min-content_2rem]',
};

type TaskListContentProps = ComposableProps;

const TaskListContent = composable<HTMLUListElement>((props, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const {
    tasks,
    groupByStatus,
    hierarchical,
    selected,
    dragging,
    debug,
    showGroupLabels,
    showOrdinals,
    showDescription,
    showGutter,
    isCollapsed,
    onCollapseToggle,
    onTaskSelect,
    onTaskUpdate,
    onTaskMove,
  } = useTaskListContext('TaskList.Content');
  // Collapsed ids live in `Root`; read through the callback so a flip still recomputes.
  const collapsed = useMemo(() => new Set(tasks.map((task) => task.id).filter(isCollapsed)), [tasks, isCollapsed]);

  // Grouping and hierarchy are alternatives: a status group holds its tasks flat, because a
  // sub-task's status need not match its parent's.
  const grouping = !hierarchical && groupByStatus && showGroupLabels ? STATUS_ORDER : undefined;

  // Numbered down the list as rendered, 1..N. Flat either way: an ordinal names a task ("run 3"),
  // where a `1.2.1` path would renumber a whole branch.
  const ordinals = useMemo(() => {
    const ordered = grouping
      ? grouping.flatMap((status) => tasks.filter((task) => (task.status ?? 'todo') === status))
      : hierarchical
        ? walkTaskTree(tasks, collapsed).map((row) => row.task)
        : tasks;
    // A dragged row and its sub-tasks are hidden rather than unmounted, so they are still in
    // `ordered` — numbering them would leave gaps in the column the reader can actually see.
    const visible = dragging.size > 0 ? ordered.filter((task) => !dragging.has(task.id)) : ordered;
    // Past 99 the number outgrows the gutter, so it is dropped rather than shrunk.
    return new Map(visible.flatMap((task, index) => (index < MAX_ORDINAL ? [[task.id, index + 1] as const] : [])));
  }, [tasks, collapsed, grouping, hierarchical, dragging]);

  // One path: every mode renders through `Tree`. A flat list is a tree of depth one, and a status
  // group is a `group` node the machine splices out of its own topology.
  return (
    <TaskTreeContent
      debug={debug}
      hierarchical={hierarchical}
      groupByStatus={grouping}
      tasks={tasks}
      collapsed={collapsed}
      showGutter={showGutter}
      ordinals={showOrdinals ? ordinals : EMPTY_ORDINALS}
      selected={selected}
      showDescription={showDescription}
      renderTrailing={TaskTreeTrailing}
      translationKey={translationKey}
      onCollapseToggle={onCollapseToggle}
      onTaskSelect={onTaskSelect}
      onTaskUpdate={onTaskUpdate}
      onTaskMove={onTaskMove}
    />
  );
});

TaskListContent.displayName = 'TaskList.Content';

//
// GroupLabel
//

type TaskListGroupLabelProps = ComposableProps;

const TaskListGroupLabel = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  return (
    <div
      {...rest}
      className={mx('col-span-full min-h-(--dx-control) flex items-center text-sm text-description', className)}
      ref={forwardedRef}
    >
      <span>{children}</span>
    </div>
  );
});

TaskListGroupLabel.displayName = 'TaskList.GroupLabel';

//
// Drag and drop. The mechanics come from `react-ui-list` (the tree-item hitbox, its instructions,
// and the drop indicator), so a task tree behaves like the navtree; the row itself stays a listbox
// option rather than being re-expressed as a treegrid row.
//

/** How long the cursor must rest on a collapsed branch before it opens, so crossing one does not. */
const EXPAND_DWELL = 600;

/**
 * Distance from the title cell's own inline start to the title text: the disclosure toggle (`w-6`)
 * plus the cell's `gap-1`. The description sits in a different grid row and has to clear the same
 * distance to line up under the title.
 */
const TOGGLE_INSET = '1.75rem';

const useTaskDrag = ({
  task,
  row,
  tasks,
  onTaskMove,
  isCollapsed,
  onCollapseToggle,
  onDraggingChange,
}: {
  task: Task.Task;
  row?: TaskTreeRow;
  tasks: readonly Task.Task[];
  onTaskMove?: (task: Task.Task, placement: TaskPlacement) => void;
  isCollapsed: (id: string) => boolean;
  onCollapseToggle: (id: string) => void;
  onDraggingChange: (task: Task.Task | undefined) => void;
}) => {
  const rowRef = useRef<HTMLLIElement | null>(null);
  const dragHandleRef = useRef<HTMLSpanElement | null>(null);
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const expandTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liftFrame = useRef<number | null>(null);

  // Read through a ref so the listeners are registered once per row rather than re-registered on
  // every keystroke elsewhere in the list; a drag in flight must not lose its target.
  const latest = useRef({ tasks, onTaskMove, isCollapsed, onCollapseToggle, onDraggingChange, row });
  latest.current = { tasks, onTaskMove, isCollapsed, onCollapseToggle, onDraggingChange, row };

  const cancelLift = useCallback(() => {
    if (liftFrame.current !== null) {
      cancelAnimationFrame(liftFrame.current);
      liftFrame.current = null;
    }
  }, []);

  const cancelExpand = useCallback(() => {
    if (expandTimeout.current) {
      clearTimeout(expandTimeout.current);
      expandTimeout.current = null;
    }
  }, []);

  const enabled = !!onTaskMove && !!row;

  useEffect(() => {
    const element = rowRef.current;
    const handle = dragHandleRef.current;
    if (!enabled || !element || !handle) {
      return;
    }

    const data: TaskDragData = { type: TASK_DRAG_TYPE, taskId: task.id };

    /** The placement a drag over this row currently means, or undefined when the drop is refused. */
    const placementFor = (instruction: Instruction | null): TaskPlacement | undefined => {
      const intent = dropIntent(instruction);
      const source = latest.current.tasks.find(({ id }) => id === draggingId.current);
      if (!intent || !source) {
        return undefined;
      }
      return resolveTaskPlacement({ tasks: latest.current.tasks, source, target: task, intent });
    };

    return combine(
      draggable({
        // Dragging is started from the handle alone: a whole-row drag would fight text selection and
        // the row's own click-to-select.
        element: handle,
        getInitialData: () => data,
        // ...but what is dragged is the task AND its sub-tasks, which travel with it, so the preview
        // is the whole subtree. The browser's default drag image is the dragged element, which here
        // would be the grip alone.
        onGenerateDragPreview: ({ location, nativeSetDragImage }) => {
          const rows = subtreeRows(element, latest.current.tasks, task);
          const { left, top } = element.getBoundingClientRect();
          const { clientX, clientY } = location.initial.input;
          // Offset by where the grip was grabbed, so the preview does not jump under the cursor.
          const offset = { x: clientX - left, y: clientY - top };
          // Always a clone, one row or many: the live element cannot be made translucent without the
          // row itself flashing before it is lifted out.
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: () => offset,
            render: ({ container }) => renderSubtreePreview(container, element, rows),
          });
        },
        onDragStart: () => {
          draggingId.current = task.id;
          // Deferred a frame: the browser snapshots the drag image as it finishes dispatching
          // `dragstart`, and hiding the rows before that would hand it an empty picture.
          liftFrame.current = requestAnimationFrame(() => latest.current.onDraggingChange(task));
        },
        // Also fires when the drag is cancelled, so the rows always come back.
        onDrop: () => {
          draggingId.current = undefined;
          cancelLift();
          latest.current.onDraggingChange(undefined);
        },
      }),
      dropTargetForElements({
        element,
        getData: ({ input, element }) =>
          attachInstruction(data, {
            input,
            element,
            indentPerLevel: INDENT_PER_LEVEL,
            currentLevel: (latest.current.row?.level ?? 1) - 1,
            mode: itemMode({
              branch: latest.current.row?.branch ?? false,
              open: !latest.current.isCollapsed(task.id),
              last: (latest.current.row?.position ?? 1) === (latest.current.row?.setSize ?? 1),
            }),
            // `make-child` is offered on a leaf too: dropping onto one is how a sub-task is made.
            block: [],
          }),
        canDrop: ({ source }) => isTaskDragData(source.data) && source.data.taskId !== task.id,
        getIsSticky: () => true,
        onDrag: ({ self }) => {
          const desired = extractInstruction(self.data);
          // Refused drops are shown as blocked rather than silently ignored, so the cursor says no.
          const next: Instruction | null =
            desired !== null && desired.type !== 'instruction-blocked' && !placementFor(desired)
              ? { type: 'instruction-blocked', desired }
              : desired;
          setInstruction(next);

          const { row, isCollapsed, onCollapseToggle } = latest.current;
          if (next?.type === 'make-child' && row?.branch && isCollapsed(task.id) && !expandTimeout.current) {
            expandTimeout.current = setTimeout(() => {
              expandTimeout.current = null;
              onCollapseToggle(task.id);
            }, EXPAND_DWELL);
          } else if (next?.type !== 'make-child') {
            cancelExpand();
          }
        },
        onDragLeave: () => {
          cancelExpand();
          setInstruction(null);
        },
        onDrop: ({ self, source }) => {
          cancelExpand();
          setInstruction(null);
          if (!isTaskDragData(source.data)) {
            return;
          }
          const moved = latest.current.tasks.find(({ id }) => id === source.data.taskId);
          const intent = dropIntent(extractInstruction(self.data));
          if (!moved || !intent) {
            return;
          }
          const placement = resolveTaskPlacement({ tasks: latest.current.tasks, source: moved, target: task, intent });
          if (placement) {
            latest.current.onTaskMove?.(moved, placement);
          }
        },
      }),
    );
  }, [enabled, task.id, cancelExpand, cancelLift]);

  useEffect(
    () => () => {
      cancelExpand();
      cancelLift();
    },
    [cancelExpand, cancelLift],
  );

  return { instruction, rowRef, dragHandleRef, dragHandle: enabled };
};

/**
 * The rendered rows of `task`'s subtree, in document order: the row itself plus every visible
 * descendant. A collapsed branch contributes only its own row, which is what the reader sees.
 */
const subtreeRows = (element: HTMLElement, tasks: readonly Task.Task[], task: Task.Task): HTMLElement[] => {
  const list = element.parentElement;
  const ids = subtreeIds(tasks, task);
  return list
    ? Array.from(list.querySelectorAll<HTMLElement>('[data-task-id]')).filter((row) =>
        ids.has(row.dataset.taskId ?? ''),
      )
    : [element];
};

/** Translucent enough to read as picked up rather than dropped, while its own text stays legible. */
const DRAG_PREVIEW_OPACITY = '0.8';

/**
 * Clones the subtree into the drag preview. The container is made a grid carrying the list's own
 * track sizes: the rows are `grid-cols-subgrid`, so without them a detached copy collapses to its
 * content width and the columns no longer line up.
 */
const renderSubtreePreview = (container: HTMLElement, element: HTMLElement, rows: HTMLElement[]): void => {
  const list = element.parentElement;
  const listStyle = list && getComputedStyle(list);
  container.style.display = 'grid';
  container.style.width = `${element.getBoundingClientRect().width}px`;
  if (listStyle) {
    container.style.gridTemplateColumns = listStyle.gridTemplateColumns;
    container.style.columnGap = listStyle.columnGap;
    container.style.gridAutoRows = listStyle.gridAutoRows;
    container.style.alignItems = listStyle.alignItems;
  }
  // The preview is torn off the page, so it needs its own ground to sit on — and the opacity reads
  // as "in hand", which is what distinguishes it from the rows it is being dragged over.
  container.classList.add('bg-base-surface');
  container.style.opacity = DRAG_PREVIEW_OPACITY;
  for (const row of rows) {
    container.appendChild(row.cloneNode(true));
  }
};

/**
 * Id of the task currently being dragged. Module-level because the drag source and the row under
 * the cursor are different components, and the hitbox reports only the target's own data mid-drag;
 * a rejected drop has to be refused while the cursor is over it, not after the drop.
 */
const draggingId = { current: undefined as string | undefined };

//
// Item — one row. Exported so a host can render its own selection of tasks.
//

type TaskListItemProps = ComposableProps<{ task: Task.Task; ordinal?: number; row?: TaskTreeRow }>;

const TaskListItem = composable<HTMLLIElement, { task: Task.Task; ordinal?: number; row?: TaskTreeRow }>(
  ({ task, ordinal, row, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const {
      tasks,
      showDescription,
      showEstimates,
      showGutter,
      onTaskUpdate,
      getTaskActions,
      selected,
      onTaskSelect,
      onTaskMove,
      isCollapsed,
      onCollapseToggle,
      dragging,
      onDraggingChange,
    } = useTaskListContext('TaskList.Item');
    const { className, ...rest } = composableProps(props);
    const { instruction, rowRef, dragHandleRef, dragHandle } = useTaskDrag({
      task,
      row,
      tasks,
      onTaskMove,
      onCollapseToggle,
      isCollapsed,
      onDraggingChange,
    });
    const open = row ? !isCollapsed(task.id) : undefined;

    // Subscribe per row: a query re-emits when membership changes, not when a task's own fields do,
    // so a rename elsewhere (task form, agent, sync) would otherwise leave the row stale.
    const [snapshot] = useObject(task);
    const current = snapshot ?? task;

    const done = current.status === 'done';
    const error = current.status === 'failed';

    // Only when the list asks for it, and only when there is something to show — an empty second
    // line would make every row taller for nothing.
    const description = showDescription ? current.description?.trim() || undefined : undefined;

    // Virtual: an open task whose dependencies (resolved within the set) are not all done.
    const blocked = (current.status ?? 'todo') === 'todo' && !Task.isTaskReady(tasks, task);
    // A started agent task is actively being worked by a sub-agent (started is stamped at spawn),
    // so it spins; a human-started task keeps the static glyph.
    const active = current.status === 'started' && current.assignee?.role === 'assistant';
    const { icon, classNames: iconClassNames } = active
      ? { icon: 'ph--spinner--regular', classNames: 'text-info-text animate-spin' }
      : STATUS_ICONS[current.status ?? 'todo'];

    const handleToggle = useCallback(
      () => onTaskUpdate?.(task, { status: done ? 'todo' : 'done' }),
      [onTaskUpdate, task, done],
    );

    // Restructuring keys. `Alt` rather than the outliner's bare `Tab`/`Shift-Tab`: a row is a
    // listbox option, not a text field, and consuming `Tab` there would remove the only way to move
    // focus out of the list. One modifier covers all four moves.
    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLLIElement>) => {
        // A reader needs a way back out of a selection, and `Escape` is where they look for it.
        if (event.key === 'Escape' && selected === task.id) {
          event.preventDefault();
          onTaskSelect?.(undefined);
          return;
        }
        if (!onTaskMove || !row || !event.altKey) {
          return;
        }
        const placement = (() => {
          switch (event.key) {
            case 'ArrowRight':
              return resolveIndent(tasks, task);
            case 'ArrowLeft':
              return resolveOutdent(tasks, task);
            case 'ArrowUp':
              return resolveNudge(tasks, task, 'up');
            case 'ArrowDown':
              return resolveNudge(tasks, task, 'down');
            default:
              return undefined;
          }
        })();
        if (placement) {
          event.preventDefault();
          event.stopPropagation();
          onTaskMove(task, placement);
        }
      },
      [onTaskMove, row, tasks, task, selected, onTaskSelect],
    );

    return (
      <Listbox.Item
        {...rest}
        id={task.id}
        data-testid='taskList.item'
        // The drag preview has to find this row's descendants in the DOM, and `Listbox.Item`'s `id`
        // is its selection key rather than a DOM id.
        data-task-id={task.id}
        // `px-0`: a subgrid's own inline padding shrinks its first and last tracks, so the listbox
        // item's default inset would push the status control off the column the create row's `+`
        // sits in. The list's inset belongs to the host, not the row.
        classNames={mx(
          'group/row col-span-full grid grid-cols-subgrid px-0 items-start relative',
          // Hidden rather than unmounted: the drag is anchored to this row's handle, and removing it
          // from the DOM mid-flight would cancel the gesture in some browsers.
          dragging.has(task.id) && 'hidden',
          className,
        )}
        // A row stays `role=option` (that is what carries selection and roving focus), so nesting is
        // announced by these rather than by treegrid semantics.
        aria-level={row?.level}
        aria-posinset={row && row.position}
        aria-setsize={row && row.setSize}
        aria-expanded={row?.branch ? open : undefined}
        // Depth is published once as variables: the title cell and the description sit in different
        // grid rows and both step in by it, and the description additionally clears the toggle so it
        // starts under the title text rather than under the toggle.
        style={
          row
            ? ({
                '--task-indent': paddingIndentation(row.level, INDENT_PER_LEVEL).paddingInlineStart,
                '--task-title-inset': `calc(var(--task-indent) + ${TOGGLE_INSET})`,
              } as CSSProperties)
            : undefined
        }
        onKeyDown={handleKeyDown}
        ref={useComposedRefs(rowRef, forwardedRef)}
      >
        {showGutter && (
          // Handle and ordinal share one cell: the handle takes the ordinal's place on hover rather
          // than claiming a column of its own, so no row shifts when the cursor crosses it.
          <div className='relative flex h-8 items-center justify-center'>
            {ordinal !== undefined && (
              <Tag
                hue={done ? 'green' : error ? 'rose' : 'neutral'}
                classNames={mx(
                  'tabular-nums',
                  dragHandle && 'group-hover/row:invisible group-has-[:focus-visible]/row:invisible',
                )}
              >
                {ordinal}
              </Tag>
            )}
            {dragHandle && (
              <span
                data-testid='taskList.dragHandle'
                aria-hidden
                className={mx(
                  'dx-fullscreen grid place-items-center text-subdued cursor-grab active:cursor-grabbing',
                  // A handle with no ordinal beneath it is the cell's only content, so it stays put;
                  // otherwise it appears only while the row is under the cursor or holds focus.
                  ordinal !== undefined && 'invisible group-hover/row:visible group-has-[:focus-visible]/row:visible',
                )}
                ref={dragHandleRef}
              >
                <Icon icon='ph--dots-six-vertical--regular' size={4} />
              </span>
            )}
          </div>
        )}
        {onTaskUpdate ? (
          <IconButton
            classNames={mx('justify-self-center my-1', iconClassNames)}
            variant='ghost'
            density='sm'
            icon={icon}
            iconOnly
            label={done ? t('mark-todo.label') : t('mark-done.label')}
            onClick={handleToggle}
          />
        ) : (
          <span className='grid h-8 place-items-center justify-self-center'>
            <Icon icon={icon} classNames={iconClassNames} size={4} />
            <span className='sr-only'>{t(`status-${current.status ?? 'todo'}.label`)}</span>
          </span>
        )}
        <span
          // Depth pads the title cell alone, so the status control and every trailing cell stay in
          // their subgrid columns and the rows keep one geometry however deep the tree goes.
          className={mx(
            'flex h-8 items-center gap-1 min-w-0',
            row && 'ps-(--task-indent)',
            onTaskSelect && 'cursor-pointer',
          )}
        >
          {row && (
            <TreeItemToggle
              isBranch={row.branch}
              open={open}
              onClick={(event) => {
                // The row is the selection target; toggling a branch must not also re-select it.
                event.stopPropagation();
                onCollapseToggle(task.id);
              }}
            />
          )}
          <span className='truncate'>{current.title}</span>
        </span>
        {/* One column for every chip on the row — assignee, blocked, artifacts — with the priority
            control last, immediately before the actions button. */}
        <div className='h-8 flex justify-end items-center gap-1'>
          {current.assignee && <TaskListAssignee assignee={current.assignee} />}
          {blocked && <Tag hue='indigo'>{t('task-blocked.label')}</Tag>}
          <TaskListItemArtifacts task={task} />
          {showEstimates && <TaskEstimateControl task={task} />}
          <TaskPriorityIcon task={task} />
        </div>
        <TaskListItemActions task={task} />
        {instruction && <TreeDropIndicator instruction={instruction} gap={0} />}
        {description && (
          // Its own row in the subgrid, starting under the title and spanning the label columns.
          <TaskDescription
            content={description}
            classNames={mx(
              showGutter ? 'col-start-3' : 'col-start-2',
              // Aligned under its own title — which sits past the disclosure toggle — so a
              // sub-task's description does not read as belonging to the row above it.
              row && 'ps-(--task-title-inset)',
              // Ends before the chip column rather than spanning a fixed count: the grid has one
              // fewer track since the chips collapsed into one, and a stale span ran the description
              // under the priority and actions controls.
              'col-end-[-3] pb-1',
            )}
          />
        )}
      </Listbox.Item>
    );
  },
);

/** Offered with `none` first, so clearing is reachable without hunting. */
const ESTIMATES: (Task.Estimate | 'none')[] = ['none', 'xs', 's', 'm', 'l', 'xl'];

/**
 * Estimate as its own label rather than a glyph: the sizes are a vocabulary a reader already knows
 * (`XS`…`XL`), and two ordinal ramps side by side would be read as one. Rendered on every row so
 * setting an estimate never depends on discovering a hover affordance, and reading as `–` when
 * unset — a dash says "no size yet" where a blank cell says nothing at all.
 */
const TaskEstimateControl = ({ task }: { task: Task.Task }) => {
  const { t } = useTranslation(translationKey);
  const { onTaskUpdate } = useTaskListContext('TaskList.EstimateControl');
  const estimate = task.estimate;
  const label = estimate ? estimate.toUpperCase() : '–';

  if (!onTaskUpdate) {
    return <span className='grid h-8 w-6 shrink-0 place-items-center text-xs tabular-nums text-subdued'>{label}</span>;
  }

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          variant='ghost'
          density='sm'
          data-testid='taskList.item.estimate'
          classNames='w-6 px-0 text-xs tabular-nums text-subdued'
          // The row is the selection target; opening the menu must not also select it.
          onClick={(event: React.MouseEvent) => event.stopPropagation()}
        >
          {label}
        </Button>
      </Menu.Trigger>
      <Menu.Content
        items={ESTIMATES.map((value) =>
          createMenuAction(
            `estimate-${value}`,
            () => onTaskUpdate(task, { estimate: value === 'none' ? null : value }),
            {
              label: value === 'none' ? t('estimate-none.label') : value.toUpperCase(),
              checked: (estimate ?? 'none') === value,
            },
          ),
        )}
      />
    </Menu.Root>
  );
};

TaskEstimateControl.displayName = 'TaskList.EstimateControl';

/**
 * Priority as a signal-strength glyph rather than a word: the four levels are ordinal, so a ramp
 * reads at a glance where four differently-worded tags do not. The ramp itself is neutral — shape
 * carries the level — so only `urgent` is coloured, which is what makes it findable in a long list.
 */
// The ramp levels carry no colour of their own so they follow the row's `--icons-color`, which
// dims them at rest and lifts them when the row is hovered, focused or selected. A pinned
// `text-subdued` overrides that variable and left the current row's priority grey against its
// brightened title, which reads as the icon being disabled.
const PRIORITY_ICONS: Record<string, { icon: string; classNames: string }> = {
  low: { icon: 'px--bar-low--regular', classNames: '' },
  medium: { icon: 'px--bar-medium--regular', classNames: '' },
  high: { icon: 'px--bar-high--regular', classNames: '' },
  urgent: { icon: 'ph--exclamation-mark--fill', classNames: '[--icons-color:var(--color-rose-text)] opacity-100!' },
};

/** Offered in ascending order, with `none` first so clearing is the reachable default. */
const PRIORITIES: Task.Priority[] = ['none', 'low', 'medium', 'high', 'urgent'];

const NO_PRIORITY_ICON = 'ph--dot--regular';

/**
 * Priority as a signal-strength glyph rather than a word: the four levels are ordinal, so a ramp
 * reads at a glance where four differently-worded tags do not. `urgent` breaks the ramp deliberately
 * — it is a different kind of statement from "how much", and a filled mark carries that.
 *
 * The glyph is also the control: it opens a menu to set the level. It renders on every row —
 * including one with no priority, which shows a dot — so setting a priority never depends on
 * discovering a hover affordance.
 */
const TaskPriorityIcon = ({ task }: { task: Task.Task }) => {
  const { t } = useTranslation(translationKey);
  const { onTaskUpdate } = useTaskListContext('TaskList.PriorityIcon');
  const priority = task.priority ?? 'none';
  const style = PRIORITY_ICONS[priority];

  if (!onTaskUpdate) {
    // Falls back to the dot rather than rendering nothing: a readonly row still says "no priority"
    // in the same column its neighbours use, so the list reads as one column and not a ragged one.
    return (
      <IconBlock square>
        <Icon icon={style?.icon ?? NO_PRIORITY_ICON} size={4} classNames={mx('shrink-0', style?.classNames)} />
      </IconBlock>
    );
  }

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <CompactIconButton
          variant='ghost'
          icon={style?.icon ?? NO_PRIORITY_ICON}
          label={t('task-priority.label')}
          data-testid='taskList.item.priority'
          classNames={mx(style?.classNames)}
          // The row is the selection target; opening the menu must not also select it.
          onClick={(event) => event.stopPropagation()}
        />
      </Menu.Trigger>
      <Menu.Content
        items={PRIORITIES.map((value) =>
          createMenuAction(`priority-${value}`, () => onTaskUpdate(task, { priority: value }), {
            label: t(`priority-${value}.label`),
            icon: PRIORITY_ICONS[value]?.icon ?? NO_PRIORITY_ICON,
            checked: priority === value,
          }),
        )}
      />
    </Menu.Root>
  );
};

/** Trailing cells of a tree row — the same content the flat row puts after its title. */
const TaskTreeTrailing = ({ item }: { item: TaskNode }) => {
  const { t } = useTranslation(translationKey);
  const { showEstimates } = useTaskListContext('TaskList.TreeTrailing');
  const task = item.task;
  if (!task) {
    return null;
  }

  return (
    <>
      {/* Variable-width chips share one cell — an artifact tag has no fixed size, so it cannot own a
          column. Everything after it does, which is what makes those controls line up down the
          list rather than sitting wherever the tags happened to end. */}
      <div className='flex h-8 items-center justify-end gap-1'>
        <TaskListItemArtifacts task={task} />
        {task.assignee && <TaskListAssignee assignee={task.assignee} />}
      </div>
      <div className='flex h-8 items-center justify-center'>{showEstimates && <TaskEstimateControl task={task} />}</div>
      <div className='flex h-8 items-center justify-center'>
        <TaskPriorityIcon task={task} />
      </div>
      <TaskListItemActions task={task} />
    </>
  );
};

//
// Item actions — the trailing cell of a row.
//

const ROW_ACTION_CLASSNAMES = 'invisible group-hover/row:visible group-has-[:focus-visible]/row:visible';

const isMenuAction = (item: MenuItem): item is MenuAction => 'data' in item && typeof item.data === 'function';

/**
 * A row's contributed actions. One is a plain button — a `…` menu hiding a single item costs a click
 * to discover nothing — and several collapse into the overflow menu, matching the nav tree's rows.
 */
const TaskListItemActions = ({ task }: { task: Task.Task }) => {
  const { t } = useTranslation(translationKey);
  const { getTaskActions } = useTaskListContext('TaskList.ItemActions');
  const actions = useMemo(() => getTaskActions?.(task) ?? [], [getTaskActions, task]);

  if (actions.length === 0) {
    return null;
  }

  const [only] = actions;
  if (actions.length === 1 && isMenuAction(only)) {
    return (
      <CompactIconButton
        variant='ghost'
        icon={only.properties?.icon ?? fallbackIcon}
        label={toLocalizedString(only.properties?.label, t)}
        data-testid={only.properties?.testId}
        classNames={ROW_ACTION_CLASSNAMES}
        onClick={(event) => {
          // The row is the selection target; running its action must not also select it.
          event.stopPropagation();
          void executeMenuAction(only);
        }}
      />
    );
  }

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <CompactIconButton
          variant='ghost'
          icon='ph--dots-three-vertical--regular'
          label={t('task-actions.label')}
          data-testid='taskList.item.actions'
          classNames={ROW_ACTION_CLASSNAMES}
          onClick={(event) => event.stopPropagation()}
        />
      </Menu.Trigger>
      <Menu.Content items={actions} />
    </Menu.Root>
  );
};

/**
 * What a task produced, one tag each. Queried rather than read off `ref.target`: on a cold load the
 * targets are not in memory yet, and a sync read would leave the row permanently empty.
 */
const TaskListItemArtifacts = ({ task }: { task: Task.Task }) => {
  const db = Obj.getDatabase(task);
  const ids = useMemo(
    () =>
      (task.artifacts ?? []).flatMap((ref) => {
        const id = Task.refEntityId(ref);
        return id ? [id] : [];
      }),
    [task.artifacts],
  );
  const queried = useQuery(ids.length > 0 ? db : undefined, Filter.id(...ids));
  // Without a database — a story, a preview — the refs were made from objects already in hand, so
  // their targets resolve synchronously and the row still shows what the task produced.
  const artifacts = db ? queried : (task.artifacts ?? []).flatMap((ref) => (ref.target ? [ref.target] : []));

  return (
    <>
      {artifacts.map((artifact) => (
        <ArtifactTag key={artifact.id} artifact={artifact} />
      ))}
    </>
  );
};

/**
 * One artifact, as a tag that opens the object's preview card — the row names what the task
 * produced, and the reader wants to see it without leaving the list.
 *
 * Click, not hover or focus: the tag sits inside a listbox option, where a tab stop of its own would
 * split the row into several arrow-key stops, and a hover card would fire while the pointer crosses
 * the row on its way somewhere else.
 */
const ArtifactTag = ({ artifact }: { artifact: Obj.Unknown }) => {
  const tagRef = useRef<HTMLSpanElement>(null);
  const label = Obj.getLabel(artifact) ?? Obj.getTypename(artifact) ?? '';
  const handleClick = useCallback(
    (event: MouseEvent<HTMLSpanElement>) => {
      // The row is an option: without this the click selects the task as well as opening the card.
      event.stopPropagation();
      const trigger = tagRef.current;
      trigger?.dispatchEvent(new DxAnchorActivate({ trigger, dxn: Obj.getURI(artifact), label, kind: 'card' }));
    },
    [artifact, label],
  );

  return (
    <Tag ref={tagRef} hue='amber' role='button' classNames='cursor-pointer' onClick={handleClick}>
      {label}
    </Tag>
  );
};

ArtifactTag.displayName = 'TaskList.ArtifactTag';

TaskListItemArtifacts.displayName = 'TaskList.ItemArtifacts';

TaskListItemActions.displayName = 'TaskList.ItemActions';

TaskListItem.displayName = 'TaskList.Item';

// TODO(burdon): Reconcile with `CompactIconButton` from `react-ui-form`.
const CompactIconButton = (props: IconButtonProps) => {
  return (
    <span className='grid size-8 shrink-0 place-items-center'>
      <IconButton variant='ghost' iconOnly density='sm' {...props} />
    </span>
  );
};

//
// Create — the add row; renders nothing unless the root supplies `onTaskCreate`.
//

type TaskListEditProps = ComposableProps<{
  /** Placeholder for the title field when nothing is selected (the create case). */
  placeholder?: string;
  /**
   * Edit a description under the title — the selected task's, or the new task's when creating, so a
   * task can be added with one. Off by default, matching `Root`'s `showDescription`: a markdown
   * field is several rows tall wherever it appears, which a single-line strip has no room for.
   */
  showDescription?: boolean;
  /** Placeholder for the description field. */
  descriptionPlaceholder?: string;
  /**
   * Lay the pane out on the list's own column template, so the title field starts where the rows'
   * titles do and the icon sits under their status controls. Off by default: a pane used away from
   * a list (a dialog, a story) has no columns to line up with.
   */
  grid?: boolean;
}>;

/**
 * The detail half of the list: it edits whichever task is selected, and creates one when none is.
 *
 * Editing lives here rather than in the row because a row is 32px of shared subgrid — a field
 * opening inside it moves everything around it. A pane below the list has room to be a field.
 */
const TaskListEdit = composable<HTMLDivElement, TaskListEditProps>(
  (
    { placeholder = 'Add task', showDescription = false, descriptionPlaceholder = 'Add a description', grid, ...props },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const { tasks, selected, onTaskCreate, onTaskUpdate, onTaskSelect, showGutter } =
      useTaskListContext('TaskList.Edit');
    const { className, ...rest } = composableProps(props);

    const task = useMemo(() => tasks.find(({ id }) => id === selected), [tasks, selected]);
    // Subscribe to the selected task so the pane follows a rename made anywhere else.
    const [snapshot] = useObject(task);
    const current = snapshot ?? task;

    const descriptionRef = useRef<MarkdownEditableController>(null);

    // The create row's description, mirrored out of the field. A ref rather than state because the
    // create reads it in the same tick it commits the field, and `useEditable` calls back
    // synchronously — a `setState` would still hold the previous render's text.
    const draftDescription = useRef('');
    // Bumped after a create, to rebuild the held-open editor empty. The field is uncontrolled while
    // creating (there is no task to read from), so clearing it means remounting it.
    const [createEpoch, setCreateEpoch] = useState(0);

    const [draft, setDraft] = useState('');
    // The pane is a view onto whichever task is selected, so switching tasks replaces the text it
    // holds rather than carrying the previous one's across. The description ref is cleared here too:
    // the field remounts empty on the way back to creating, but `commit()` on an already-empty field
    // never calls back — so text abandoned before a selection would otherwise ride along, unseen,
    // into the next task created.
    //
    // State rather than a ref for the previous id (React's adjust-state-on-prop-change pattern): a
    // render React abandons leaves a ref already mutated, so the retry would skip the reset and the
    // pane would keep the previous task's text.
    const [editingId, setEditingId] = useState<string | undefined>(undefined);
    if (editingId !== current?.id) {
      setEditingId(current?.id);
      setDraft(current?.title ?? '');
      draftDescription.current = '';
    }

    const commitTitle = useCallback(() => {
      const title = draft.trim();
      if (task && current) {
        if (title.length > 0 && title !== current.title) {
          onTaskUpdate?.(task, { title });
        }
      } else if (title.length > 0) {
        // Nothing has committed the description yet — it is held open and the reader is in the
        // title — so commit it here, before assembling the draft it belongs to.
        descriptionRef.current?.commit();
        const description = draftDescription.current.trim();
        onTaskCreate?.({ title, ...(description.length > 0 && { description }) });
        setDraft('');
        draftDescription.current = '';
        setCreateEpoch((epoch) => epoch + 1);
      }
    }, [draft, task, current, onTaskCreate, onTaskUpdate]);

    // Blur commits a rename but never a create: leaving the field is not a decision to add a task,
    // and half a title would become one — clicking the list, the thread, or anywhere else would
    // leave a stray behind. Creating takes Enter or Save, which are the deliberate acts.
    const handleTitleBlur = useCallback(() => {
      if (task && current) {
        commitTitle();
      }
    }, [task, current, commitTitle]);

    const handleTitleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          commitTitle();
        }
      },
      [commitTitle],
    );

    // Writes both fields and leaves, as cancelling does — the pane drops back to creating either
    // way, and only what it did with the pending text differs. Creating commits the description
    // itself (it is part of the draft), so this only has to for an edit.
    const handleSave = useCallback(() => {
      commitTitle();
      if (task && current) {
        descriptionRef.current?.commit();
      }
      onTaskSelect?.(undefined);
    }, [commitTitle, task, current, onTaskSelect]);

    // Throws away the pending edit and leaves: the pane drops back to creating, which is the same
    // exit Escape on a row gives. Reverting first, since deselecting unmounts the fields. An
    // abandoned create is cleared rather than reverted — a blur may already have committed text into
    // the field, and reverting would restore exactly that.
    const handleCancel = useCallback(() => {
      if (task && current) {
        descriptionRef.current?.revert();
      } else {
        draftDescription.current = '';
        setCreateEpoch((epoch) => epoch + 1);
      }
      setDraft('');
      onTaskSelect?.(undefined);
    }, [task, current, onTaskSelect]);

    // Nothing to create with and nothing to edit: the pane has no purpose.
    if (!onTaskCreate && !(current && onTaskUpdate)) {
      return null;
    }

    // On the list's template the pane has the rows' columns: the ordinal gutter it leaves empty, the
    // status column takes the icon, and the title column takes the field — which is what puts the
    // caret where the rows' titles start. Off it, the pane keeps a template of its own.
    // One further right than the pane's own cells suggest, for the reserved toggle column.
    const titleColumn = grid ? (showGutter ? 'col-start-4' : 'col-start-3') : 'col-start-2';

    return (
      // One grid, not a row of grids: the title and the description line up column for column, and
      // the toolbar can sit on the title line while coming LAST in the DOM — so Tab runs title →
      // description → buttons rather than stopping at a button on the way to the text.
      <div
        {...rest}
        data-testid='taskList.edit'
        className={mx(
          'grid gap-x-1 w-full min-w-0 shrink-0',
          grid
            ? showGutter
              ? GRID_COLS.contentWithOrdinals
              : GRID_COLS.content
            : 'grid-cols-[1.5rem_1fr_min-content]',
          className,
        )}
      >
        <span
          className={mx(
            'flex items-center justify-center h-8',
            // Placed explicitly: column 1 is the reserved toggle, so implicit placement would put
            // the icon a toggle's width left of the rows' status control.
            grid && (showGutter ? 'col-start-3' : 'col-start-2'),
          )}
        >
          <Icon
            icon={current ? 'ph--pencil-simple--regular' : 'ph--plus--regular'}
            size={4}
            classNames='text-subdued'
          />
        </span>
        <Input.Root>
          <Input.TextInput
            variant='subdued'
            classNames={mx('px-0', grid && [titleColumn, 'col-end-[-2]'])}
            data-testid='taskList.edit.title'
            placeholder={current ? t('task-title.placeholder') : placeholder}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleTitleKeyDown}
            onBlur={handleTitleBlur}
          />
        </Input.Root>
        {showDescription && (current ? onTaskUpdate : onTaskCreate) && (
          <span
            data-testid='taskList.edit.description'
            // Placed explicitly, never by flow: the toolbar is absent until something is typed, so a
            // description left to auto-place would take the cell it vacates and fall into the icon
            // column — a field one word wide.
            className={mx('flex min-w-0 col-end-[-2]', grid ? titleColumn : 'col-start-2')}
          >
            {/* A description is markdown, so it is edited as markdown. `editing` is held open —
                  the pane IS the editor, so there is nothing to click into — and the key remounts
                  it per task, since a field held open never re-reads its subject.

                  Creating, the field is uncontrolled: there is no task to read a value from, so it
                  holds the draft itself until the create collects it. */}
            <MarkdownEditable
              key={current?.id ?? `create-${createEpoch}`}
              ref={descriptionRef}
              classNames='text-sm'
              {...(current && { value: current.description ?? '' })}
              editing
              multiline
              onValueChange={(description) => {
                if (task && current) {
                  onTaskUpdate?.(task, { description });
                } else {
                  draftDescription.current = description;
                }
              }}
              placeholder={descriptionPlaceholder}
              // Held open, so it must not pull focus: selecting a row by keyboard would otherwise
              // land the reader in the description instead of the list.
              autoFocus={false}
            />
          </span>
        )}
        {/* The description is held open with no blur to commit it, so the pane needs to say
            explicitly what happens to the pending text. Both buttons keep focus where it is
            (`preventDefault` on mousedown): the fields commit on blur, so a button that took focus
            would commit before its own handler ran — and Cancel could never mean anything.
            Placed on the title line explicitly; its place in the DOM is what orders Tab.

            Hidden while the add row is untouched: with nothing typed there is nothing to save and
            nothing to cancel, and two dead controls on an empty row read as a form to fill in
            rather than a place to type. */}
        {(current || draft.trim().length > 0) && (
          <Toolbar.Root density='sm' classNames='row-start-1 col-start-[-2] p-0 bg-transparent'>
            {/* Only when editing an existing task: the create row has nothing to set a priority on
                until it is saved. */}
            {task && <TaskPriorityIcon task={task} />}
            <Toolbar.IconButton
              variant='ghost'
              iconOnly
              icon='ph--check--regular'
              data-testid='taskList.edit.save'
              label={t('save-task.label')}
              onClick={handleSave}
              onMouseDown={(event) => event.preventDefault()}
            />
            <Toolbar.IconButton
              variant='ghost'
              iconOnly
              icon='ph--x--regular'
              data-testid='taskList.edit.cancel'
              label={t('cancel-edit.label')}
              onClick={handleCancel}
              onMouseDown={(event) => event.preventDefault()}
            />
          </Toolbar.Root>
        )}
      </div>
    );
  },
);

TaskListEdit.displayName = 'TaskList.Edit';

//
// Assignee — actor-aware chip: a Person ref resolves to the contact's name; otherwise fall back to
// name, email, or a shortened DID; agents (`role: 'assistant'`) are marked with a sparkle.
//

type TaskListAssigneeProps = { assignee: Actor.Actor };

const TaskListAssignee = composable<HTMLSpanElement, TaskListAssigneeProps>(({ assignee }, _forwardedRef) => {
  const [contact] = useObject(assignee.contact);
  const label =
    contact?.fullName ??
    assignee.name ??
    assignee.email ??
    (assignee.identityDid ? shortDid(assignee.identityDid) : undefined);
  const agent = assignee.role === 'assistant';
  if (!label && !agent) {
    return null;
  }

  return (
    <Tag hue={agent ? 'purple' : 'indigo'}>
      {agent && <Icon icon='ph--sparkle--regular' size={3} classNames='inline-block me-1' />}
      {label ?? 'agent'}
    </Tag>
  );
});

TaskListAssignee.displayName = 'TaskList.Assignee';

const shortDid = (did: string): string => `${did.slice(0, 12)}…`;

//
// TaskList
//

export const TaskList = {
  Root: TaskListRoot,
  Viewport: TaskListViewport,
  Content: TaskListContent,
  GroupLabel: TaskListGroupLabel,
  Item: TaskListItem,
  Edit: TaskListEdit,
  Assignee: TaskListAssignee,
};

export type {
  TaskListAssigneeProps,
  TaskListContentProps,
  TaskListEditProps,
  TaskListGroupLabelProps,
  TaskListItemProps,
  TaskListRootProps,
  TaskListViewportProps,
};
