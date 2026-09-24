//
// Copyright 2024 DXOS.org
//

// The tree is built on `@ark-ui/react`'s TreeView (zag state machine): the machine owns focus,
// the full APG keymap (arrows, Home/End, typeahead, `*`), and ARIA; DXOS owns everything else —
// the atom-family `TreeModel` (reactively walked into an Ark `TreeCollection`), theme classes,
// pragmatic-drag-and-drop, and the end-of-row column renderer. Expansion and selection are fully
// controlled: machine callbacks are mapped onto the model's `onOpenChange`/`onSelect`, and the
// next walk feeds the resulting state back in.

import { createTreeCollection } from '@ark-ui/react/collection';
import { TreeView } from '@ark-ui/react/tree-view';
import {
  type Instruction,
  type ItemMode,
  attachInstruction,
  extractInstruction,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, {
  type FC,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Icon, type Label, Tag, TextTooltip, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type WindowController, useListModel, useWindow, windowRowProps } from '@dxos/react-ui-virtual';
import {
  getStyles,
  hoverableControls,
  hoverableFocusedKeyboardControls,
  hoverableFocusedWithinControls,
  mx,
} from '@dxos/ui-theme';
import { type Density } from '@dxos/ui-types';

import { Path } from '../../util/index.ts';
import { DROP_INDENTATION, indentTrack } from './helpers.ts';
import { type RowUnit, flattenRowUnits, nominalExtents, rowUnitId, useScroller } from './row-window.ts';
import { type TreeData, isTreeDataFor } from './tree-data.ts';
import {
  type ColumnRenderer,
  type HeadingRenderer,
  type IconRenderer,
  type RowActivation,
  type SelectModifiers,
  type TreeItemDataProps,
  type TreeModel,
  type TreeNodeEntry,
  type TreeRenderContextValue,
  TreeRenderProvider,
  useTreeRender,
} from './TreeContext.ts';
import { TreeDropDebug } from './TreeDropDebug.tsx';
import { type DropKind, TreeDropIndicator } from './TreeDropIndicator.tsx';
import { TreeItemToggle } from './TreeItemToggle.tsx';

const hoverableDescriptionIcons =
  '[--icons-color:inherit] hover-hover:[--icons-color:var(--description-text)] hover-hover:hover:[--icons-color:inherit] focus-within:[--icons-color:inherit]';

/** How long recorded pointer modifiers stay valid for the machine's selection callback. */
const MODIFIER_WINDOW = 500;

const NO_MODIFIERS: SelectModifiers = { option: false, shift: false, meta: false };

/**
 * The row track and the grid that lays rows out on it.
 *
 * Named because the grid moves: unwindowed it is the tree element, windowed it is the mounted
 * parent inside it, and a row's `col-[tree-row]` has to resolve against whichever one holds it.
 */
const TREE_TRACK = '[tree-row-start] minmax(0, 1fr) [tree-row-end]';
const TREE_GRID = 'grid gap-0.5';

type TreeWalkState<T extends { id: string }> = {
  root: TreeNodeEntry<T>;
  expanded: string[];
  selected: string[];
  byValue: Map<string, TreeNodeEntry<T>>;
};

/** Splices group wrappers out so the machine sees their children as direct children of the group's parent. */
const spliceGroups = <T extends { id: string }>(entries: TreeNodeEntry<T>[] = []): TreeNodeEntry<T>[] =>
  entries.flatMap((entry) => (entry.group ? spliceGroups(entry.children) : [entry]));

/** Assigns collection index paths and sibling counts over the spliced topology. */
const assignIndexPaths = <T extends { id: string }>(entries: TreeNodeEntry<T>[] | undefined, base: number[]): void => {
  const siblings = spliceGroups(entries ?? []);
  siblings.forEach((entry, index) => {
    entry.indexPath = [...base, index];
    entry.setsize = siblings.length;
    assignIndexPaths(entry.children, entry.indexPath);
  });
};

/**
 * Reactive walk: model atoms → entry tree + controlled expansion/selection. Any dependency change
 * (topology, item props, open/current state) recomputes the walk, which feeds the machine a fresh
 * collection.
 */
const createTreeWalkAtom = <T extends { id: string }>(
  model: TreeModel<T>,
  rootId: string | undefined,
  rootPath: string[],
): Atom.Atom<TreeWalkState<T>> =>
  Atom.make((get: any): TreeWalkState<T> => {
    const expanded: string[] = [];
    const selected: string[] = [];
    const byValue = new Map<string, TreeNodeEntry<T>>();

    // `level` is 1-based visual depth: top rows sit flush, each depth indents one step; group
    // children stay at their header's level.
    const walkChildren = (parentId: string | undefined, parentPath: string[], level: number): TreeNodeEntry<T>[] => {
      const childIds: string[] = get(model.childIds(parentId));
      const entries: TreeNodeEntry<T>[] = [];
      for (const id of childIds) {
        if (parentPath.includes(id)) {
          continue;
        }
        const item: T | undefined = get(model.item(id));
        if (!item) {
          continue;
        }
        const path = [...parentPath, id];
        const props: TreeItemDataProps = get(model.itemProps(path));
        const value = Path.create(...path);
        const open: boolean = get(model.itemOpen(path));
        const current: boolean = get(model.itemCurrent(path));
        const group = props.disposition === 'group';
        const branch = !group && !!props.parentOf;
        const entry: TreeNodeEntry<T> = {
          id,
          value,
          path,
          level,
          last: false,
          item,
          props,
          group,
          branch,
          open,
          current,
          indexPath: [],
          setsize: 0,
        };
        if (group) {
          entry.children = walkChildren(id, path, level);
          // An empty group renders nothing — suppress the orphaned section label.
          if (entry.children.length === 0) {
            continue;
          }
        } else if (branch) {
          entry.children = walkChildren(id, path, level + 1);
          entry.childrenCount = Math.max(entry.children.length, props.parentOf?.length ?? 0);
          if (open) {
            expanded.push(value);
          }
        }
        if (current) {
          selected.push(value);
        }
        byValue.set(value, entry);
        entries.push(entry);
      }
      if (entries.length > 0) {
        entries[entries.length - 1].last = true;
      }
      return entries;
    };

    const rootChildren = walkChildren(rootId, rootPath, 1);
    const root: TreeNodeEntry<T> = {
      id: rootId ?? '',
      value: Path.create(...rootPath),
      path: rootPath,
      level: 0,
      last: true,
      item: { id: rootId ?? '' } as T,
      props: { id: rootId ?? '', label: '' },
      group: false,
      branch: true,
      open: true,
      current: false,
      children: rootChildren,
      childrenCount: rootChildren.length,
      indexPath: [],
      setsize: 1,
    };
    assignIndexPaths(root.children, []);
    return { root, expanded, selected, byValue };
  });

export type TreeProps<T extends { id: string } = any> = {
  model: TreeModel<T>;
  rootId?: string;
  path?: string[];
  id: string;
  /**
   * Accessible name for the tree. Ark names it "Tree View" by default, which says what the widget
   * is and not which list it is — a page with more than one is then unnavigable by name. Rendered
   * into the machine's own `Label` part, so the tree carries one name rather than an `aria-label`
   * competing with the `aria-labelledby` Ark points at that part regardless.
   */
  ariaLabel?: string;
  classNames?: string | (string | undefined)[];
  /**
   * The row's whole column template, `[tree-row-start] … [tree-row-end]`. The first track is the
   * disclosure toggle, one control wide; the heading and every column a `renderColumns` returns
   * flow into the tracks after it in DOM order, so a consumer names its own tracks here and places
   * cells with `col-[name]` — one grid per row, nothing nested.
   */
  gridTemplateColumns?: string;
  /**
   * Control density of the disclosure toggle. The toggle is one `--dx-control` square, so this is
   * what makes it tile with a denser row rather than holding a `md` square in an `sm` grid.
   */
  density?: Density;
  /**
   * Render a disclosure toggle in the template's first track. Off for a tree that is a flat list
   * — one whose model never has a branch — so the template starts with the consumer's own first
   * cell rather than holding a square for a chevron no row will ever show.
   */
  toggle?: boolean;
  draggable?: boolean;
  selectionMode?: 'single' | 'multiple';
  renderColumns?: ColumnRenderer<T>;
  renderIcon?: IconRenderer<T>;
  renderHeading?: HeadingRenderer<T>;
  canDrop?: (params: { source: TreeData; target: TreeData }) => boolean;
  /** What dropping at an instruction does; `reject` blocks it and `link` draws a dashed indicator. A move when absent. */
  getDropKind?: (params: { instruction: Instruction; source: TreeData; target: TreeData }) => DropKind;
  /**
   * Whether a row with no children can be dropped onto to adopt the dragged item. Off by default:
   * in a tree whose leaves are terminal (a navtree's documents) nesting into one is meaningless, so
   * the hitbox drops the zone. Trees whose every node can take children — a task list, where any
   * task can gain a sub-task — turn it on, and without it a peer offers no make-child zone and so
   * no drop indicator either.
   */
  leavesAcceptChildren?: boolean;
  /**
   * Move selection with the roving tabstop. An APG tree leaves selection to an explicit activation,
   * which is right when selecting navigates; a list whose selection only highlights a row wants the
   * highlight to follow the arrows instead.
   */
  selectionFollowsFocus?: boolean;
  /**
   * Paint every row's drop bands and label them, so the zones a drag can land in are visible
   * without holding one. A development affordance — the geometry mirrors the hitbox's, so a band
   * that looks wrong here is a band that behaves wrong under the pointer.
   */
  debug?: boolean;
  /**
   * Give an open branch a reorder-below zone, meaning "after this row and everything under it".
   *
   * The hitbox drops that zone for an expanded branch because "below the row" and "its first child"
   * are the same pixels, and offers `reparent` bands under the last descendant instead. Those bands
   * are indent-wide slivers whose position moves with the row's depth — not a target anyone can aim
   * at — so a tree whose "below" already means *after the subtree* is better served offering it
   * everywhere. Off by default: it changes what the zone means, and the navtree relies on the
   * hitbox's own reading.
   */
  dropBelowExpanded?: boolean;
  /**
   * Render a strip after the last row that accepts a drop meaning "append at the end".
   *
   * Rows are the only drop targets, and they are sticky — the pointer leaving them into the empty
   * space below keeps the last one active, so a drop there silently applies whatever instruction
   * that row was showing. Dragging past the end of a list is the obvious way to say "put it last",
   * and without this it is both invisible and wrong.
   */
  dropAtEnd?: boolean;
  /**
   * Mount only the rows in view, windowed with `@dxos/react-ui-virtual`.
   *
   * The same mechanism the trace timeline and the message feed use: the placement owns the
   * measured extents and the scrollbar, and the tree renders the mounted range into a translated
   * parent. Off by default — a list short enough to render whole gains nothing.
   *
   * An open branch's children are mounted as rows of the window after their parent, so windowed
   * disclosure is immediate rather than animated.
   */
  virtualize?: boolean;
  /**
   * The element that scrolls the tree, when the consumer owns one.
   *
   * Optional because a tree is usually inside somebody else's scroller; without it the nearest
   * scrolling ancestor is used, so windowing does not become a change to every consumer.
   */
  scrollerRef?: React.RefObject<HTMLElement | null>;
  canSelect?: (params: { item: T; path: string[] }) => boolean;
  onOpenChange?: (params: { item: T; path: string[]; open: boolean }) => void;
  /**
   * A row activation; `current` is the state the row is being taken to. In `multiple` mode a plain
   * click reports `current: true` without `meta`, meaning the row alone, and a meta-click reports
   * the toggled state with `meta`, meaning the row on top of the others.
   */
  onSelect?: (params: { item: T; path: string[]; current: boolean } & SelectModifiers) => void;
  onItemHover?: (params: { item: T }) => void;
  /**
   * Keydown on the tree container. The escape hatch for gestures the machine does not own — zag
   * ignores modified arrows, so a consumer can bind e.g. `Alt+Arrow` restructuring here rather
   * than wrapping the tree in an element that would only exist to carry the handler.
   */
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
};

/**
 * A tree over a `TreeModel`, rendered on the Ark TreeView machine: it owns disclosure, the roving
 * tabstop, selection and the APG keymap, and lays every row out as one grid on the consumer's
 * `gridTemplateColumns`. The template's first track is the disclosure toggle (`toggle={false}`
 * drops it for a flat list); the heading and each `renderColumns` cell flow into the tracks after
 * it, and a row indents by padding its own grid so nested rows shift as a block while the fixed
 * trailing tracks stay aligned. Rows are drag sources and drop targets when `draggable` is set.
 */
export const Tree = <T extends { id: string } = any>({
  model,
  rootId,
  path,
  id,
  ariaLabel,
  classNames,
  gridTemplateColumns = '[tree-row-start] var(--dx-control) minmax(0, 1fr) min-content [tree-row-end]',
  density = 'md',
  toggle = true,
  draggable = false,
  selectionMode = 'single',
  renderColumns,
  renderIcon,
  renderHeading,
  canDrop,
  getDropKind,
  leavesAcceptChildren = false,
  selectionFollowsFocus = false,
  debug = false,
  dropBelowExpanded = false,
  dropAtEnd = false,
  virtualize = false,
  scrollerRef,
  canSelect,
  onOpenChange,
  onSelect,
  onItemHover,
  onKeyDown,
}: TreeProps<T>) => {
  const treePath = useMemo(() => (path ? [...path, id] : [id]), [id, path]);
  // Every tree sharing a path root is one drag scope, which is what a monitor claims: the navtree
  // mounts a `Tree` per workspace tab, and a scope per tab would leave its own drops unclaimed.
  const treeId = treePath[0];
  const walkAtom = useMemo(() => createTreeWalkAtom(model, rootId, treePath), [model, rootId, treePath]);
  const { root, expanded, selected, byValue } = useAtomValue(walkAtom);

  const collection = useMemo(
    () =>
      createTreeCollection<TreeNodeEntry<T>>({
        rootNode: root,
        nodeToValue: (node) => node.value,
        nodeToString: (node) => (typeof node.props.label === 'string' ? node.props.label : node.id),
        nodeToChildren: (node) => spliceGroups(node.children ?? []),
        nodeToChildrenCount: (node) => node.childrenCount,
        isNodeDisabled: (node) => !!node.props.disabled,
      }),
    [root],
  );

  // The machine's callbacks carry no input modifiers, so the last pointer-down's modifiers are
  // captured here and consulted (within a freshness window) when selection changes.
  const modifiersRef = useRef<SelectModifiers & { at: number }>({ ...NO_MODIFIERS, at: 0 });
  const handlePointerDownCapture = useCallback((event: PointerEvent) => {
    modifiersRef.current = {
      option: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey || event.ctrlKey,
      at: Date.now(),
    };
  }, []);
  const recentModifiers = useCallback((): SelectModifiers => {
    const { option, shift, meta, at } = modifiersRef.current;
    return Date.now() - at < MODIFIER_WINDOW ? { option, shift, meta } : NO_MODIFIERS;
  }, []);

  const setOpen = useCallback(
    (node: TreeNodeEntry<T>, open: boolean) => onOpenChange?.({ item: node.item, path: node.path, open }),
    [onOpenChange],
  );

  const toggleOpen = useCallback((node: TreeNodeEntry<T>) => setOpen(node, !node.open), [setOpen]);

  /** The consumer's verdict alone. A disabled row answers no activation at all, which is separate. */
  const allowsSelect = useCallback(
    (node: TreeNodeEntry<T>) => canSelect?.({ item: node.item, path: node.path }) ?? true,
    [canSelect],
  );

  const onSelectNode = useCallback(
    (node: TreeNodeEntry<T>, activation: RowActivation) => {
      if (node.props.disabled) {
        return;
      }
      if (node.branch && (activation.option || !allowsSelect(node))) {
        toggleOpen(node);
      } else if (allowsSelect(node)) {
        onSelect?.({ item: node.item, path: node.path, ...activation });
      }
    },
    [allowsSelect, onSelect, toggleOpen],
  );

  const handleExpandedChange = useCallback(
    ({ expandedValue }: { expandedValue: string[] }) => {
      const previous = new Set(expanded);
      const next = new Set(expandedValue);
      for (const value of expandedValue) {
        if (!previous.has(value)) {
          const entry = byValue.get(value);
          entry && setOpen(entry, true);
        }
      }
      for (const value of expanded) {
        if (!next.has(value)) {
          const entry = byValue.get(value);
          entry && setOpen(entry, false);
        }
      }
    },
    [expanded, byValue, setOpen],
  );

  /** Last row the machine reported focus on — the target `Enter`/`Space` act upon. */
  const focusedValueRef = useRef<string | null>(null);

  // Controlled, so focus can be directed (a drop returns it to the row that moved) rather than only
  // observed. Mirrors the machine's own changes back, which is what keeps it a roving tabstop.
  const [focusedValue, setFocusedValue] = useState<string | null>(null);

  /**
   * Node awaiting DOM focus. Held in a ref so the effect below survives the re-renders the drop
   * causes, and carrying the id as well as the value: a drop that reparents changes the row's path,
   * so the value captured when the drag started no longer matches anything.
   */
  const pendingFocusRef = useRef<{ id: string; value: string; revealed?: { value: string; units?: RowUnit[] } } | null>(
    null,
  );
  const treeRef = useRef<HTMLDivElement | null>(null);

  /**
   * Directs the roving tabstop at a row, and takes DOM focus with it.
   *
   * The controlled value alone is not enough: the machine moves focus in response to interaction,
   * and a drop is not one of its events — after one every row is left at `tabindex=-1`. The node is
   * looked up when the effect runs rather than captured here, because the reorder replaces or moves
   * the row's element, and focusing a node the commit is about to move only blurs it again.
   */
  const focusNode = useCallback((id: string, value: string) => {
    pendingFocusRef.current = { id, value };
    focusedValueRef.current = value;
    setFocusedValue(value);
  }, []);

  const claimFocus = useCallback((value: string, row: HTMLElement) => {
    if (pendingFocusRef.current?.value !== value) {
      return;
    }
    pendingFocusRef.current = null;
    // Only while focus is still where the drag left it: the reader may have clicked away, and
    // taking it back then would be worse than losing the tabstop.
    const active = document.activeElement;
    if (!active || active === document.body || active === treeRef.current || row.contains(active)) {
      row.focus();
    }
  }, []);

  /** Brings a row into a windowed tree's mounted range, and says whether the window has it; set while windowed. */
  const revealRef = useRef<((value: string) => boolean) | null>(null);

  // No dependency array: the render that lands the reorder is the one to follow, and which render
  // that is depends on how the consumer commits the move. A row outside the window is revealed
  // once instead, and claims the focus itself when it mounts.
  useEffect(() => {
    const pending = pendingFocusRef.current;
    const value =
      pending &&
      (byValue.has(pending.value)
        ? pending.value
        : [...byValue.values()].find((entry) => entry.id === pending.id)?.value);
    if (pending && !value) {
      pendingFocusRef.current = null;
    }
    // Revealed once per value and set of window units: a move that lands a render later is new units.
    if (!pending || !value || (pending.revealed?.value === value && pending.revealed.units === units)) {
      return;
    }
    if (value !== pending.value) {
      pending.value = value;
      focusedValueRef.current = value;
      setFocusedValue(value);
    }
    const row = treeRef.current?.querySelector<HTMLElement>(`[data-object-id][data-value="${CSS.escape(value)}"]`);
    if (row) {
      claimFocus(value, row);
    } else if (revealRef.current) {
      // A windowed tree that has no unit for the row (it is inside a collapsed branch) cannot show it.
      if (revealRef.current(value)) {
        pending.revealed = { value, units };
      } else {
        pendingFocusRef.current = null;
      }
    }
  });

  // The machine moves focus over the whole collection, and focuses the row a frame after asking for
  // it to be scrolled to; a row the window has not mounted by then claims the focus when it mounts.
  const scrollToNode = useCallback(
    ({ node, getElement }: { node: TreeNodeEntry<T>; getElement: () => HTMLElement | null }) => {
      if (revealRef.current?.(node.value) && !getElement()) {
        pendingFocusRef.current = { id: node.id, value: node.value };
      }
    },
    [],
  );

  // A dragged open branch is collapsed for the drag and reopened after it. Here rather than on the
  // row: a windowed row can scroll out of the window mid-drag, and an unmounted row hears no drop.
  // Read through refs, so the consumer re-rendering on the collapse cannot resubscribe the monitor
  // mid-drag and lose the branch it has to reopen.
  const byValueRef = useRef(byValue);
  byValueRef.current = byValue;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  useEffect(() => {
    if (!draggable) {
      return;
    }

    // The drag this tree's own row started: trees sharing a drag scope each hear every drag.
    let drag: { entry: TreeNodeEntry<T>; reopen: boolean } | undefined;
    return monitorForElements({
      onDragStart: ({ source }) => {
        const entry =
          isTreeDataFor(source.data, treeId) && treeRef.current?.contains(source.element)
            ? byValueRef.current.get(Path.create(...source.data.path))
            : undefined;
        drag = entry && { entry, reopen: !!entry.branch && entry.open };
        if (drag?.reopen) {
          onOpenChangeRef.current?.({ item: drag.entry.item, path: drag.entry.path, open: false });
        }
      },
      onDrop: () => {
        if (!drag) {
          return;
        }
        const { entry, reopen } = drag;
        drag = undefined;
        if (reopen) {
          onOpenChangeRef.current?.({ item: entry.item, path: entry.path, open: true });
        }
        // Return the roving tabstop to the row that moved, so the arrows carry on from where the
        // reader left it — a drag leaves focus on the body, which restarts navigation at the top of
        // the tree. Asking the machine rather than calling `focus()` here: the reorder moves the
        // row's DOM node, and moving a node blurs it, so any focus set around the drop races the
        // commit. As controlled state it is simply the focused value once the tree renders.
        focusNode(entry.id, entry.value);
      },
    });
  }, [draggable, treeId, focusNode]);

  // Focus moves without a selection event of its own, so the follow is driven from the machine's
  // focus change rather than inferred from the selection one.
  const handleFocusChange = useCallback(
    ({ focusedValue }: { focusedValue: string | null }) => {
      // Recorded whatever the follow setting is: the keyboard's own activation needs the focused
      // row, and the machine reports it nowhere else.
      focusedValueRef.current = focusedValue;
      setFocusedValue(focusedValue);
      if (pendingFocusRef.current?.value !== focusedValue) {
        pendingFocusRef.current = null;
      }
      if (!selectionFollowsFocus || !focusedValue || selected.includes(focusedValue)) {
        return;
      }
      // A modified activation is the pointer's to report: the machine moves focus first, and
      // following it here would select (and open) the row a heartbeat before the meta-click says it
      // wanted a second view of it instead.
      if (recentModifiers().meta) {
        return;
      }
      // Only the row's own focus selects — the arrows, or a click on the row. Focus landing on a
      // control inside it (a delete button, a status menu, a checkbox) bubbles the same event, and
      // following it selected the row the reader was about to act on: a delete briefly swapped the
      // edit pane onto the doomed task before it vanished.
      const active = document.activeElement;
      if (active && active !== document.body && active.closest('[data-object-id]') !== active) {
        return;
      }
      const entry = byValue.get(focusedValue);
      if (entry) {
        onSelectNode(entry, { ...NO_MODIFIERS, current: true });
      }
    },
    [selectionFollowsFocus, selected, byValue, onSelectNode, recentModifiers],
  );

  const handleSelectionChange = useCallback(
    ({ selectedValue, focusedValue }: { selectedValue: string[]; focusedValue: string | null }) => {
      const previous = new Set(selected);
      const value =
        focusedValue && selectedValue.includes(focusedValue)
          ? focusedValue
          : selectedValue.find((candidate) => !previous.has(candidate));
      const entry = value ? byValue.get(value) : undefined;
      if (entry) {
        onSelectNode(entry, { ...recentModifiers(), current: true });
      }
    },
    [selected, byValue, onSelectNode, recentModifiers],
  );

  /** The machine emits no selection event for a row that is already selected, so `Enter` is taken here. */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || (event.key !== 'Enter' && event.key !== ' ')) {
        return;
      }
      // The row is a div with role=button, so a real inner control (chevron, status, rename input)
      // keeps its own activation.
      if ((event.target as HTMLElement).closest('button, input, textarea, [contenteditable="true"]')) {
        return;
      }
      const focused = focusedValueRef.current;
      const entry = focused ? byValue.get(focused) : undefined;
      if (!entry) {
        return;
      }
      if (event.key === ' ') {
        // The machine refuses every disclosure path it owns for a disabled branch — the chevron's
        // click and both arrows — and `Space` is the one it leaves to us.
        if (entry.branch && !entry.props.disabled) {
          event.preventDefault();
          toggleOpen(entry);
        }
        return;
      }
      event.preventDefault();
      if (!entry.props.disabled && allowsSelect(entry)) {
        onSelect?.({ item: entry.item, path: entry.path, current: true, ...NO_MODIFIERS, keyboard: true });
      }
    },
    [onKeyDown, byValue, toggleOpen, allowsSelect, onSelect],
  );

  // Flipped after the first commit: branch content inserted during the initial paint (persisted
  // open state) must not animate; only user-driven disclosure does.
  const mountedRef = useRef(false);

  const units = useMemo(
    () => (virtualize ? flattenRowUnits(root.children, { end: dropAtEnd && draggable }) : undefined),
    [virtualize, root.children, dropAtEnd, draggable],
  );
  // Keyed on what stays put across walks, so the end strip keeps its drop target registered.
  const endData = useMemo<TreeData>(
    () => ({ treeId, id: root.id, path: root.path, item: { id: root.id } }),
    [treeId, root.id, root.path],
  );
  const scroller = useScroller(treeRef, scrollerRef, !!units);
  const windowed = !!units && !!scroller;
  // The first commit that renders rows, which a tree still finding its scroller has not had.
  const resolving = !!units && scroller === undefined;
  useEffect(() => {
    mountedRef.current ||= !resolving;
  }, [resolving]);

  const renderContext = useMemo<TreeRenderContextValue<T>>(
    () => ({
      treeId,
      draggable,
      toggle,
      gridTemplateColumns,
      density,
      renderColumns,
      renderIcon,
      renderHeading,
      canDrop,
      getDropKind,
      leavesAcceptChildren,
      debug,
      dropBelowExpanded,
      onOpenChange,
      onItemHover,
      selectNode: onSelectNode,
      canSelect,
      selectionMode,
      mountedRef,
      windowed,
      claimFocus,
    }),
    [
      treeId,
      draggable,
      toggle,
      gridTemplateColumns,
      density,
      renderColumns,
      renderIcon,
      renderHeading,
      canDrop,
      getDropKind,
      leavesAcceptChildren,
      debug,
      dropBelowExpanded,
      onSelectNode,
      canSelect,
      selectionMode,
      onOpenChange,
      onItemHover,
      windowed,
      claimFocus,
    ],
  );

  return (
    <TreeView.Root
      collection={collection}
      expandedValue={expanded}
      focusedValue={focusedValue}
      selectedValue={selected}
      selectionMode={selectionMode}
      expandOnClick={false}
      lazyMount
      onExpandedChange={handleExpandedChange}
      onSelectionChange={handleSelectionChange}
      onFocusChange={handleFocusChange}
      scrollToIndexFn={windowed ? scrollToNode : undefined}
      className='contents'
    >
      {/* The name the machine already points `aria-labelledby` at; `sr-only` because the tree is
          labelled for assistive technology, not captioned on screen. */}
      {ariaLabel && <TreeView.Label className='sr-only'>{ariaLabel}</TreeView.Label>}
      <TreeRenderProvider value={renderContext as TreeRenderContextValue}>
        <TreeView.Tree
          ref={treeRef}
          // Sets `--dx-control` for the whole subtree, which is what actually sizes a row (the row
          // is one control tall and its toggle track one control wide) — so `density` alone is
          // enough and a consumer needs no `dx-density-*` class of its own.
          data-density={density}
          // `outline-none`: the machine parks focus on the tree container (tabIndex=-1) when no
          // row holds it, which must not draw a focus ring around the whole tree.
          // Row spacing belongs to the container: as a margin on each row it also offset the first
          // row from the tree's top edge, which is space between the tree and its frame, not between rows.
          // Windowed, the grid moves to the mounted parent: the tree element becomes the positioning
          // context the sizer and that parent live in, and holds no rows of its own.
          className={mx(
            'outline-none',
            windowed ? 'relative' : TREE_GRID,
            ...(Array.isArray(classNames) ? classNames : [classNames]),
          )}
          // One track: rows, section headers and the end target span it. The consumer's column
          // template is applied per row, behind an indent track, rather than here — a subgrid would
          // share one set of tracks down the tree, and padding a subgrid only shrinks its first
          // track, so nested rows could not indent their leading cells.
          style={windowed ? undefined : { gridTemplateColumns: TREE_TRACK }}
          onPointerDownCapture={handlePointerDownCapture}
          onKeyDown={handleKeyDown}
        >
          {windowed ? (
            <TreeWindow units={units} scroller={scroller} endData={endData} revealRef={revealRef} />
          ) : resolving ? null : (
            <>
              {root.children?.map((node) => (
                <TreeNodeRow key={node.value} node={node} />
              ))}
              {dropAtEnd && draggable && <TreeEndDropTarget data={endData} />}
            </>
          )}
        </TreeView.Tree>
      </TreeRenderProvider>
    </TreeView.Root>
  );
};

/**
 * The mounted rows, and a sizer that gives the scrollbar the whole tree's extent.
 *
 * The shape `@dxos/react-ui-virtual` asks for, as the trace timeline and the message feed render
 * it: rows live in a parent that is moved by a transform, so a correction changes one number and
 * never writes `scrollTop` out from under the reader.
 */
const TreeWindow = ({
  units,
  scroller,
  endData,
  revealRef,
}: {
  units: RowUnit[];
  scroller: HTMLElement;
  endData: TreeData;
  revealRef: RefObject<((value: string) => boolean) | null>;
}) => {
  const scrollerRef = useRef<HTMLElement | null>(scroller);
  scrollerRef.current = scroller;
  const model = useListModel(units, rowUnitId);
  const controllerRef = useRef<WindowController>(null);
  const { placement, windowRef, offset, sizerExtent, first, last } = useWindow({
    scrollerRef,
    model,
    extents: nominalExtents,
    controllerRef,
  });

  // Nearest edge, which is what the `scrollIntoView({ block: 'nearest' })` of an unwindowed tree did.
  useEffect(() => {
    revealRef.current = (value) => {
      const index = units.findIndex((unit) => unit.kind === 'row' && unit.key === value);
      if (index < 0) {
        return false;
      }

      const { first, last } = placement.layout().visible;
      if (index < first) {
        controllerRef.current?.scrollToIndex(index, 'start');
      } else if (index > last) {
        controllerRef.current?.scrollToIndex(index, 'end');
      }
      return true;
    };

    return () => {
      revealRef.current = null;
    };
  }, [units, placement, revealRef]);

  const mounted = [];
  for (let index = first; index <= last; index++) {
    const unit = units[index];
    if (!unit) {
      continue;
    }

    const id = rowUnitId(unit);
    mounted.push(
      <div key={id} role='none' className='col-[tree-row] grid grid-cols-subgrid' {...windowRowProps(index, id)}>
        {unit.kind === 'header' ? (
          <TreeSectionHeader label={unit.label} />
        ) : unit.kind === 'end' ? (
          <TreeEndDropTarget data={endData} />
        ) : (
          <TreeNodeRow node={unit.node} />
        )}
      </div>,
    );
  }

  return (
    <>
      <div style={{ blockSize: sizerExtent }} />
      <div
        ref={windowRef}
        className={mx('absolute inline-start-0 inline-end-0 top-0', TREE_GRID)}
        style={{ gridTemplateColumns: TREE_TRACK, transform: `translateY(${offset}px)` }}
      >
        {mounted}
      </div>
    </>
  );
};

/** Renders a section-group label spanning the full tree row. Used when a node has `disposition === 'group'`. */
const TreeSectionHeader = ({ label }: { label: Label }) => {
  const { t } = useTranslation();
  const { toggle } = useTreeRender();
  return (
    // `presentation`: a heading is not a permitted child of `role=tree`, and the label is
    // decorative — the group's items remain individually labeled.
    <div
      role='presentation'
      className={mx(
        'col-[tree-row] pt-3 pb-0.5 text-xs uppercase tracking-widest text-subdued hover:text-description select-none',
        // Cleared past the toggle track so the label starts where the rows' first cell does.
        toggle && 'ps-(--dx-control)',
      )}
    >
      {toLocalizedString(label, t)}
    </div>
  );
};

type TreeNodeRowProps = {
  node: TreeNodeEntry;
};

const TreeNodeRow: FC<TreeNodeRowProps> = memo(({ node }) => {
  const { windowed } = useTreeRender();
  if (node.group) {
    return (
      <>
        <TreeSectionHeader label={node.props.label} />
        {node.children?.map((child) => (
          <TreeNodeRow key={child.value} node={child} />
        ))}
      </>
    );
  }

  return (
    <TreeView.NodeProvider node={node} indexPath={node.indexPath}>
      {node.branch ? (
        <TreeView.Branch className='contents' aria-posinset={node.indexPath.at(-1)! + 1} aria-setsize={node.setsize}>
          <TreeNodeRowContent node={node} />
          {/* Windowed, the children are rows of the window's own. */}
          {!windowed && <TreeBranchContent node={node} />}
        </TreeView.Branch>
      ) : (
        <TreeNodeRowContent node={node} />
      )}
    </TreeView.NodeProvider>
  );
});

TreeNodeRow.displayName = 'Tree.NodeRow';

/**
 * Branch children container. Disclosure animates height (via `interpolate-size`, opacity-only
 * where unsupported) — but only for content inserted after the initial paint, so a tree restoring
 * persisted open state does not animate every branch on load. The gate is stamped at DOM insertion
 * time because lazy-mounted content attaches long after the row first renders.
 */
const TreeBranchContent: FC<TreeNodeRowProps> = ({ node }) => {
  const { mountedRef } = useTreeRender();

  const handleRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (element && mountedRef.current) {
        element.dataset.animate = '';
      }
    },
    [mountedRef],
  );

  return (
    <TreeView.BranchContent
      ref={handleRef}
      // `[&[hidden]]:hidden` restores the UA collapse that the `grid` display would defeat, and
      // `empty:hidden` keeps a childless branch from occupying a row: even at zero height it would
      // draw the tree's row gap around it, so toggling an empty branch grew the tree by the gap.
      // The machine sets `hidden` only once the conceal has run, so the two never fight.
      className={mx(
        // Same `gap-0.5` as the tree: this is a separate grid, so the tree's own gap does not reach
        // the rows inside an expanded branch.
        'col-[tree-row] grid grid-cols-subgrid gap-0.5 [&[hidden]]:hidden empty:hidden',
        '[interpolate-size:allow-keywords]',
        'data-[animate]:data-[state=open]:animate-tree-disclose',
        'data-[animate]:data-[state=closed]:animate-tree-conceal',
      )}
    >
      {node.children?.map((child) => (
        <TreeNodeRow key={child.value} node={child} />
      ))}
    </TreeView.BranchContent>
  );
};

TreeBranchContent.displayName = 'Tree.BranchContent';

/**
 * A strip after the last row that accepts "append at the end".
 *
 * It carries the tree's root as its payload with `atEnd`, so a consumer's monitor can tell this
 * drop from one onto the root itself. No hitbox: there is only one thing this can mean.
 */
const TreeEndDropTarget = ({ data }: { data: TreeData }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    return dropTargetForElements({
      element,
      getData: () => ({ ...data, atEnd: true }),
      canDrop: ({ source }) => isTreeDataFor(source.data, data.treeId),
      onDragEnter: () => setOver(true),
      onDragLeave: () => setOver(false),
      onDrop: () => setOver(false),
    });
  }, [data]);

  return (
    <div ref={ref} role='none' className='relative col-[tree-row] min-h-(--dx-control)'>
      {over && <div className='absolute inset-x-0 top-0 h-0.5 bg-accent-bg' />}
    </div>
  );
};

TreeEndDropTarget.displayName = 'Tree.EndDropTarget';

type TreeItemDragState = 'idle' | 'dragging' | 'preview' | 'parent-of-instruction';

/** The visible row: branch control or leaf item, with DnD wiring, columns, and the drop indicator. */
const TreeNodeRowContent: FC<TreeNodeRowProps> = memo(({ node }) => {
  const {
    treeId,
    draggable: treeDraggable,
    toggle,
    gridTemplateColumns,
    density,
    renderColumns: Columns,
    renderHeading: RenderHeading,
    canDrop,
    getDropKind,
    leavesAcceptChildren,
    debug,
    dropBelowExpanded,
    onOpenChange,
    onItemHover,
    selectNode,
    canSelect,
    selectionMode,
    claimFocus,
  } = useTreeRender();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const cancelExpandRef = useRef<NodeJS.Timeout | null>(null);
  const [dragState, setDragState] = useState<TreeItemDragState>('idle');
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [dropKind, setDropKind] = useState<DropKind>('move');
  const [menuOpen, setMenuOpen] = useState(false);

  const { id, value, item, path, level, branch, open, last, current, props, indexPath, setsize } = node;
  // `expanded` only applies to a branch that is actually showing children: the mode exists to drop
  // the reorder-below zone, because "below an open branch" and "its first child" are the same place.
  // A leaf reports `open` too (nothing distinguishes it in the model), and treating that as expanded
  // stripped the below zone from every childless row — so nothing could be dropped after one.
  //
  // Tested before `last`, not after: an open branch that is also its parent's last child was taking
  // `last-in-group`, which put a reorder-below band and the indent-split reparent bands on the
  // branch's own row — directly above its first child, so two indicators competed for one gap. The
  // zones that mean "after this branch" belong at the end of its subtree, where its last visible
  // descendant is itself last-in-group and its indent chooses the level.
  const mode: ItemMode = branch && open && !dropBelowExpanded ? 'expanded' : last ? 'last-in-group' : 'standard';
  const data = { treeId, id, path, item } satisfies TreeData;
  const isItemDraggable = treeDraggable && props.draggable !== false;
  const selectable = !props.disabled && (canSelect?.({ item, path }) ?? true);
  const isItemDroppable = props.droppable !== false;
  const shouldSeedNativeDragData = typeof document !== 'undefined' && document.body.hasAttribute('data-platform');

  const onCancelExpand = useCallback(() => {
    if (cancelExpandRef.current) {
      clearTimeout(cancelExpandRef.current);
      cancelExpandRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!treeDraggable || (!isItemDraggable && !isItemDroppable) || !rowRef.current) {
      return;
    }

    const element = rowRef.current;
    const makeDraggable = () =>
      draggable({
        element,
        getInitialData: () => data,
        getInitialDataForExternal: () => (shouldSeedNativeDragData ? { 'text/plain': id } : {}),
        onDragStart: () => setDragState('dragging'),
        onDrop: () => setDragState('idle'),
      });

    if (!isItemDroppable) {
      return isItemDraggable ? makeDraggable() : undefined;
    }

    const dropTarget = dropTargetForElements({
      element,
      getData: ({ input, element }) =>
        attachInstruction(data, {
          input,
          element,
          indentPerLevel: DROP_INDENTATION,
          currentLevel: level,
          mode,
          block: branch || leavesAcceptChildren ? [] : ['make-child'],
        }),
      canDrop: ({ source }) => {
        const permitted = canDrop ?? (() => true);
        // A target scopes the sources it accepts for the same reason a monitor scopes the drags it
        // claims: a foreign row landing here is read by the claiming monitor as its own node type.
        return (
          source.element !== element &&
          isTreeDataFor(source.data, treeId) &&
          permitted({ source: source.data as TreeData, target: data })
        );
      },
      getIsSticky: () => true,
      onDrag: ({ self, source }) => {
        const desired = extractInstruction(self.data);
        const kind =
          desired && desired.type !== 'instruction-blocked'
            ? (getDropKind?.({ instruction: desired, source: source.data as TreeData, target: data }) ?? 'move')
            : 'move';
        const next: Instruction | null =
          kind === 'reject' && desired && desired.type !== 'instruction-blocked'
            ? { type: 'instruction-blocked', desired }
            : desired;
        setDropKind(kind);

        if (source.data.id !== id) {
          if (next?.type === 'make-child' && branch && !open && !cancelExpandRef.current) {
            cancelExpandRef.current = setTimeout(() => {
              onOpenChange?.({ item, path, open: true });
            }, 500);
          }
          if (next?.type !== 'make-child') {
            onCancelExpand();
          }
          setInstruction(next);
        } else if (next?.type === 'reparent') {
          setInstruction(next);
        } else {
          setInstruction(null);
        }
      },
      onDragLeave: () => {
        onCancelExpand();
        setInstruction(null);
      },
      onDrop: () => {
        onCancelExpand();
        setInstruction(null);
      },
    });

    if (!isItemDraggable) {
      return dropTarget;
    }

    return combine(makeDraggable(), dropTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    treeDraggable,
    isItemDraggable,
    isItemDroppable,
    item,
    id,
    treeId,
    mode,
    level,
    branch,
    open,
    canDrop,
    getDropKind,
    onOpenChange,
    onCancelExpand,
    shouldSeedNativeDragData,
  ]);

  useEffect(() => () => onCancelExpand(), [onCancelExpand]);

  // A row the tree is waiting to focus may only now be mounted, scrolled into a windowed tree's range.
  useEffect(() => {
    if (rowRef.current) {
      claimFocus(value, rowRef.current);
    }
  }, [value, claimFocus]);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (current) {
        event.preventDefault();
        selectNode(node, {
          option: event.altKey,
          shift: event.shiftKey,
          meta: event.metaKey || event.ctrlKey,
          current: true,
        });
      }
    },
    [current, node, selectNode],
  );

  const handleClickCapture = useCallback(
    (event: MouseEvent) => {
      if (selectionMode !== 'multiple' || event.shiftKey || event.altKey) {
        return;
      }
      if ((event.target as HTMLElement).closest('button, input, textarea, [contenteditable="true"]')) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      const meta = event.metaKey || event.ctrlKey;
      selectNode(node, { option: false, shift: false, meta, current: meta ? !current : true });
    },
    [selectionMode, node, current, selectNode],
  );

  const handleItemHover = useCallback(() => onItemHover?.({ item }), [onItemHover, item]);

  const handleContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault();
    setMenuOpen(true);
  }, []);

  const Comp = branch ? TreeView.BranchControl : TreeView.Item;

  return (
    <Comp
      ref={rowRef}
      data-object-id={id}
      // The live drop instruction, so a test can read which zone the pointer is in rather than
      // inferring it from the indicator's classes (make-child and reparent render identically).
      data-instruction={instruction?.type}
      data-testid={props.testId}
      // A leaf's row is its `treeitem`; a branch's `treeitem` is its wrapper, which carries these instead.
      aria-posinset={branch ? undefined : indexPath.at(-1)! + 1}
      aria-setsize={branch ? undefined : setsize}
      className={mx(
        'col-[tree-row] outline-none select-none',
        selectable ? 'cursor-pointer' : isItemDraggable && 'cursor-grab',
        isItemDraggable && 'active:cursor-grabbing',
        // The row leaves the list for the duration of the drag: the pointer is carrying it, and a
        // copy left behind in place reads as a second row rather than as the one being moved. A
        // branch's children go with it, since the drag start collapses it.
        dragState === 'dragging' && 'hidden',
        // Selection keys off zag's `data-selected`: for branches, `aria-selected` lands on the
        // Branch wrapper (display:contents) while the visible row is the control. No focus-within
        // background — after a chevron click focus rests inside the row, and a persistent fill
        // there reads as selection.
        'hover:bg-hover-surface',
        'data-[selected]:bg-current-surface data-[selected]:text-current-fg',
        // Keyboard travel paints the row it lands on rather than ringing it: a ring inside a row
        // that is already a filled band reads as a second, competing highlight, and the fill says
        // what selection says — this is the row you are on. Keyed on `:focus-visible` rather than
        // the machine's `data-focus`, which stays on the tabbable row after the tree loses focus and
        // would leave a row lit that nothing is pointing at.
        'dx-focus-ring-none',
        'focus-visible:bg-current-surface focus-visible:text-current-fg',
        // Highlight the row while a descendant marks an open popover anchor (e.g. inline rename).
        'has-[[data-popover-anchor]]:bg-current-surface',
        hoverableControls,
        hoverableFocusedKeyboardControls,
        hoverableFocusedWithinControls,
        hoverableDescriptionIcons,
        // A selected row is a row the reader is looking at, so its controls are held at full
        // strength like a focused one's. Both dimmers had a hover and a focus case but no selected
        // case, which left the current row's icons faded — the opposite of what selection means.
        'data-[selected]:[--controls-opacity:1] data-[selected]:[--icons-color:inherit]',
        'focus-visible:[--icons-color:inherit]',
        props.className,
      )}
      onClick={handleClick}
      onClickCapture={handleClickCapture}
      onMouseEnter={handleItemHover}
      onContextMenu={handleContextMenu}
    >
      {/* One grid per row, on the consumer's template, and the toggle, the heading's cells and the
          columns are all its direct children — so a consumer names every track and nothing is
          nested. The depth is padding on this grid, not a track: a real grid's padding shifts every
          track (a subgrid's only shrinks its first), and a track would sit ahead of `tree-row-start`
          where an auto-placed toggle lands instead. Rows line up down the tree because every track
          but the consumer's `1fr` is fixed: the indent is absorbed by the flexible one, and the fixed
          trailing tracks stay anchored to the row's end. The first grid row is one control tall so
          every cell centres on the title line; a heading that adds a second line (a description)
          places it with `row-start-2`. */}
      <div
        className='indent relative grid grid-rows-[var(--dx-control)]'
        style={{ gridTemplateColumns, paddingInlineStart: indentTrack(level) }}
      >
        {toggle &&
          (branch ? (
            <TreeView.BranchTrigger asChild>
              {/* zag stamps data-state=open on the trigger, which the ghost button styles as an
                  open menu trigger (bg-input-bg) — the chevron must stay transparent. */}
              <TreeItemToggle
                isBranch
                open={open}
                density={density}
                // Nothing to disclose: a branch the model knows to be childless keeps its chevron for
                // row geometry but offers no toggle.
                disabled={(node.childrenCount ?? node.children?.length ?? 0) === 0}
                classNames='data-[state=open]:bg-transparent'
              />
            </TreeView.BranchTrigger>
          ) : (
            <TreeItemToggle isBranch={false} density={density} />
          ))}
        {RenderHeading ? (
          <RenderHeading item={item} path={path} props={props} open={open} />
        ) : (
          <TreeNodeHeading item={item} path={path} props={props} />
        )}
        {Columns && <Columns item={item} path={path} open={open} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />}
        {instruction && (
          <TreeDropIndicator instruction={instruction} kind={dropKind === 'link' ? 'link' : 'move'} gap={2} />
        )}
        {debug && (
          <TreeDropDebug
            mode={mode}
            level={level}
            acceptsChildren={branch || leavesAcceptChildren === true}
            draggable={treeDraggable}
          />
        )}
      </div>
    </Comp>
  );
});

TreeNodeRowContent.displayName = 'Tree.NodeRowContent';

/** Icon + truncating label + count badge. The row itself is the interactive element. */
const TreeNodeHeading = <T extends { id: string }>({
  item,
  path,
  props,
}: {
  item: T;
  path: string[];
  props: TreeItemDataProps;
}) => {
  const { t } = useTranslation();
  const { renderIcon: RenderIcon } = useTreeRender<T>();
  const styles = props.iconHue ? getStyles(props.iconHue) : undefined;
  const text = toLocalizedString(props.label, t);
  return (
    <TextTooltip text={text} side='bottom' truncateQuery='span[data-tooltip]' onlyWhenTruncating asChild>
      <div
        data-testid='treeItem.heading'
        className={mx(
          'flex items-center min-w-0 gap-2 ps-0.5 min-h-(--dx-control) select-none',
          props.headingClassName,
        )}
      >
        {RenderIcon ? (
          <RenderIcon item={item} path={path} props={props} />
        ) : (
          props.icon && <Icon size={5} icon={props.icon} classNames={['my-1', styles?.text]} />
        )}
        <span className='min-w-0 truncate text-start' data-tooltip>
          {text}
        </span>
        <CountBadge count={props.count} modifiedCount={props.modifiedCount} />
      </div>
    </TextTooltip>
  );
};

/**
 * Renders the count badge after a tree item label.
 * A positive `modifiedCount` (e.g. new/unread items) shows as a rose badge in place of the neutral total `count`.
 */
const CountBadge = ({ count, modifiedCount }: Pick<TreeItemDataProps, 'count' | 'modifiedCount'>) => {
  if (typeof modifiedCount === 'number' && modifiedCount > 0) {
    return (
      <Tag hue='rose' classNames='shrink-0 text-center [min-inline-size:1.5rem] tabular-nums'>
        {modifiedCount}
      </Tag>
    );
  }

  if (typeof count === 'number') {
    return (
      <Tag hue='neutral' classNames='shrink-0 text-center [min-inline-size:1.5rem] tabular-nums'>
        {count}
      </Tag>
    );
  }

  return null;
};
