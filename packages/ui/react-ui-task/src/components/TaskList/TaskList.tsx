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
  DxAnchorActivate,
  Icon,
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
import { MarkdownEditable, type MarkdownEditableController, MarkdownView } from '@dxos/react-ui-markdown';
import { Menu, type MenuAction, type MenuItem, executeMenuAction, fallbackIcon } from '@dxos/react-ui-menu';
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
  showDescriptions: boolean;
  hierarchical: boolean;
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

//
// Root — headless context provider. Renders no DOM.
//

type TaskListRootProps = PropsWithChildren<{
  tasks: readonly Task.Task[];
  /** Group rows into status sections (Linear order); flat list otherwise. */
  groupByStatus?: boolean;
  /** Render the status heading above each group; grouping order is kept either way. */
  showGroupLabels?: boolean;
  /** Number rows by their position in `tasks` (set order), so tasks can be referenced by ordinal. */
  showOrdinals?: boolean;
  /** Render each task's description under its title; rows grow to fit. Off by default, so a
   * single-line list (e.g. the chat strip) keeps one row per task. */
  showDescriptions?: boolean;
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
  showDescriptions = false,
  hierarchical = false,
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
      groupByStatus={groupByStatus && !hierarchical}
      showGroupLabels={showGroupLabels}
      showOrdinals={showOrdinals}
      showDescriptions={showDescriptions}
      hierarchical={hierarchical}
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
    <Listbox.Viewport {...rest} classNames={mx('min-w-0 min-h-0', className)} ref={forwardedRef}>
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
const GRID_COLS = {
  content: 'grid-cols-[1.5rem_1fr_min-content_min-content_2rem]',
  contentWithOrdinals: 'grid-cols-[2rem_1.5rem_1fr_min-content_min-content_2rem]',
};

type TaskListContentProps = ComposableProps;

const TaskListContent = composable<HTMLUListElement>((props, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const {
    tasks,
    groupByStatus,
    showGroupLabels,
    showOrdinals,
    showDescriptions,
    hierarchical,
    showGutter,
    isCollapsed,
  } = useTaskListContext('TaskList.Content');
  // Ordinals follow the set's canonical order, not the display order, so a task keeps its number as
  // it moves between status groups — and, in a tree, as branches collapse around it. Flat by
  // design: an ordinal names a task ("run 3"), and a `1.2.1` path renumbers a whole branch every
  // time anything above it changes.
  const ordinals = useMemo(() => new Map(tasks.map((task, index) => [task.id, index + 1])), [tasks]);
  // Collapsed ids are read through the context callback rather than held here, so the walk still
  // re-runs when one flips; the set itself lives in `Root`.
  const collapsed = useMemo(() => new Set(tasks.map((task) => task.id).filter(isCollapsed)), [tasks, isCollapsed]);
  const rows = useMemo(
    () => (hierarchical ? walkTaskTree(tasks, collapsed) : undefined),
    [hierarchical, tasks, collapsed],
  );
  const groups = useMemo(() => {
    if (!groupByStatus) {
      return tasks.length > 0 ? [{ status: undefined, tasks }] : [];
    }

    return STATUS_ORDER.map((status) => ({
      status,
      tasks: tasks.filter((task) => (task.status ?? 'todo') === status),
    })).filter((group) => group.tasks.length > 0);
  }, [tasks, groupByStatus]);

  return (
    <Listbox.Content
      {...composableProps(props, {
        // Row height lives on the auto rows — an `h-8` on the grid itself would size the whole
        // list to one row and let the rest overflow invisibly. A described row is taller than one
        // line, so the tracks size to content and the cells align to the first line rather than to
        // the middle of a two-line row.
        classNames: mx(
          'group grid gap-x-1 w-full min-w-0',
          showDescriptions ? 'auto-rows-min items-start' : 'auto-rows-[2rem] items-center',
          showGutter ? GRID_COLS.contentWithOrdinals : GRID_COLS.content,
        ),
      })}
      aria-label='Tasks'
      ref={forwardedRef}
    >
      {rows
        ? rows.map((row) => (
            <TaskListItem
              key={row.task.id}
              task={row.task}
              ordinal={showOrdinals ? ordinals.get(row.task.id) : undefined}
              row={row}
            />
          ))
        : groups.map(({ status, tasks }) => (
            <Fragment key={status ?? 'all'}>
              {status && showGroupLabels && <TaskListGroupLabel>{t(`status-${status}.label`)}</TaskListGroupLabel>}
              {tasks.map((task) => (
                <TaskListItem key={task.id} task={task} ordinal={showOrdinals ? ordinals.get(task.id) : undefined} />
              ))}
            </Fragment>
          ))}
    </Listbox.Content>
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

/** A description is a line in a row, not a document: no paragraph block, no heading scale. */
const DESCRIPTION_COMPONENTS = {
  p: ({ children }: PropsWithChildren) => <span>{children}</span>,
};

const STATUS_ICONS: Record<Task.Status, { icon: string; classNames?: string }> = {
  todo: { icon: 'ph--square--regular', classNames: 'text-subdued' },
  started: { icon: 'ph--hourglass--regular', classNames: 'text-info-text' },
  review: { icon: 'ph--eye--regular', classNames: 'text-info-text' },
  done: { icon: 'ph--check--regular', classNames: 'text-success-text' },
  failed: { icon: 'ph--x--regular', classNames: 'text-error-text' },
  cancelled: { icon: 'ph--x--regular', classNames: 'text-error-text' },
};

type TaskListItemProps = ComposableProps<{ task: Task.Task; ordinal?: number; row?: TaskTreeRow }>;

const TaskListItem = composable<HTMLLIElement, { task: Task.Task; ordinal?: number; row?: TaskTreeRow }>(
  ({ task, ordinal, row, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const {
      tasks,
      showDescriptions,
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
    const description = showDescriptions ? current.description?.trim() || undefined : undefined;

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
        {current.assignee ? (
          <span className='h-8 flex justify-end items-center'>
            <TaskListAssignee assignee={current.assignee} />
          </span>
        ) : (
          <div />
        )}
        <div className='h-8 flex justify-start items-center gap-1'>
          {blocked && <Tag hue='indigo'>{t('task-blocked.label')}</Tag>}
          {current.priority && current.priority !== 'none' && <Tag hue='neutral'>{current.priority}</Tag>}
          <TaskListItemArtifacts task={task} />
        </div>
        <TaskListItemActions task={task} />
        {instruction && <TreeDropIndicator instruction={instruction} gap={0} />}
        {description && (
          // Its own row in the subgrid, starting under the title and spanning the label columns.
          <MarkdownView
            content={description}
            classNames={mx(
              showGutter ? 'col-start-3' : 'col-start-2',
              // Aligned under its own title — which sits past the disclosure toggle — so a
              // sub-task's description does not read as belonging to the row above it.
              row && 'ps-(--task-title-inset)',
              'col-span-3 pb-1 text-sm text-description line-clamp-3',
            )}
            // The row supplies the type scale and the clamp, so the description renders as one
            // inline run rather than the block paragraph the default component wraps it in.
            components={DESCRIPTION_COMPONENTS}
          />
        )}
      </Listbox.Item>
    );
  },
);

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
const TaskListEdit = composable<
  HTMLDivElement,
  { placeholder?: string; descriptionPlaceholder?: string; grid?: boolean }
>(({ placeholder = 'Add task', descriptionPlaceholder = 'Add a description', grid, ...props }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const { tasks, selected, onTaskCreate, onTaskUpdate, onTaskSelect, showGutter } = useTaskListContext('TaskList.Edit');
  const { className, ...rest } = composableProps(props);

  const task = useMemo(() => tasks.find(({ id }) => id === selected), [tasks, selected]);
  // Subscribe to the selected task so the pane follows a rename made anywhere else.
  const [snapshot] = useObject(task);
  const current = snapshot ?? task;

  const [draft, setDraft] = useState('');
  // The pane is a view onto whichever task is selected, so switching tasks replaces the title it
  // holds rather than carrying the previous one's across.
  const editingId = useRef<string | undefined>(undefined);
  if (editingId.current !== current?.id) {
    editingId.current = current?.id;
    setDraft(current?.title ?? '');
  }

  const commitTitle = useCallback(() => {
    const title = draft.trim();
    if (task && current) {
      if (title.length > 0 && title !== current.title) {
        onTaskUpdate?.(task, { title });
      }
    } else if (title.length > 0) {
      onTaskCreate?.({ title });
      setDraft('');
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

  const descriptionRef = useRef<MarkdownEditableController>(null);

  // Writes both fields and leaves, as cancelling does — the pane drops back to creating either
  // way, and only what it did with the pending text differs.
  const handleSave = useCallback(() => {
    commitTitle();
    descriptionRef.current?.commit();
    onTaskSelect?.(undefined);
  }, [commitTitle, onTaskSelect]);

  // Throws away the pending edit and leaves: the pane drops back to creating, which is the same
  // exit Escape on a row gives. Reverting first, since deselecting unmounts the fields.
  const handleCancel = useCallback(() => {
    descriptionRef.current?.revert();
    setDraft('');
    onTaskSelect?.(undefined);
  }, [onTaskSelect]);

  // Nothing to create with and nothing to edit: the pane has no purpose.
  if (!onTaskCreate && !(current && onTaskUpdate)) {
    return null;
  }

  // On the list's template the pane has the rows' columns: the ordinal gutter it leaves empty, the
  // status column takes the icon, and the title column takes the field — which is what puts the
  // caret where the rows' titles start. Off it, the pane keeps a template of its own.
  const titleColumn = grid && showGutter ? 'col-start-3' : 'col-start-2';

  return (
    // One grid, not a row of grids: the title and the description line up column for column, and
    // the toolbar can sit on the title line while coming LAST in the DOM — so Tab runs title →
    // description → buttons rather than stopping at a button on the way to the text.
    <div
      {...rest}
      data-testid='taskList.edit'
      className={mx(
        'grid gap-x-1 w-full min-w-0 shrink-0',
        grid ? (showGutter ? GRID_COLS.contentWithOrdinals : GRID_COLS.content) : 'grid-cols-[1.5rem_1fr_min-content]',
        className,
      )}
    >
      <span
        className={mx(
          'flex items-center justify-center h-8',
          // The gutter column belongs to the rows' ordinals; the icon goes under their status.
          grid && showGutter && 'col-start-2',
        )}
      >
        <Icon icon={current ? 'ph--pencil-simple--regular' : 'ph--plus--regular'} size={4} classNames='text-subdued' />
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
      {/* Only a selected task has a description to edit; there is nothing to attach one to before
            the task exists. */}
      {current && onTaskUpdate && (
        <>
          {!grid && <span />}
          <span
            data-testid='taskList.edit.description'
            className={mx('flex min-w-0', grid && [titleColumn, 'col-end-[-2]'])}
          >
            {/* A description is markdown, so it is edited as markdown. `editing` is held open —
                  the pane IS the editor, so there is nothing to click into — and the key remounts
                  it per task, since a field held open never re-reads its subject. */}
            <MarkdownEditable
              key={current.id}
              ref={descriptionRef}
              classNames='text-sm'
              value={current.description ?? ''}
              editing
              multiline
              onValueChange={(description) => task && onTaskUpdate?.(task, { description })}
              placeholder={descriptionPlaceholder}
              // Held open, so it must not pull focus: selecting a row by keyboard would otherwise
              // land the reader in the description instead of the list.
              autoFocus={false}
            />
          </span>
        </>
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
});

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
