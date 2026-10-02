//
// Copyright 2026 DXOS.org
//

// The next Tree on Ark's tree-view, fed by `TreeModel` atoms (AUDIT §6 group D point 2). zag owns focus, the APG
// keymap, typeahead, expansion and selection state; this file owns the lazy walk (tree-collection.ts), windowing, the
// Next row layout, the activation policy and pragmatic-drag-and-drop.

import { TreeView } from '@ark-ui/react/tree-view';
import {
  type Instruction,
  type ItemMode,
  attachInstruction,
  extractInstruction,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  type ElementDropTargetEventBasePayload,
  dropTargetForElements,
  draggable as makeDraggable,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { useAtomValue } from '@effect/atom-react/Hooks';
import React, {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  Fragment,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { Next, composable, composableProps, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { hues } from '@dxos/ui-types';

import { Path } from '../../util/index.ts';
import { type TreeNode, type TreeWalk, createCollection, createTreeWalkAtom } from './tree-collection.ts';
import { type TreeData, isTreeData, isTreeDataFor } from './tree-data.ts';
import { type DropKind, type RowActivation, type SelectModifiers, type TreeModel } from './tree-model.ts';
import {
  type TreeContextValue,
  type TreeDisclosure,
  TreeItemProvider,
  TreeProvider,
  type TreeVirtual,
  useTreeContext,
  useTreeItemContext,
} from './TreeContext.ts';

export type TreeDropEvent<T extends { id: string } = any> = {
  instruction: Instruction;
  source: TreeData;
  target: TreeData;
  item: T;
  /**
   * Dropped on the end strip (`dropAtEnd`): `instruction` is then `reorder-below` the last top-level row, or
   * `make-child` of the root when the tree is empty.
   */
  atEnd?: boolean;
};

export type TreeSelectEvent<T extends { id: string } = any> = {
  item: T;
  path: string[];
  /** The state the row is taken to: in `multiple` mode a meta-click reports the toggled state. */
  current: boolean;
} & SelectModifiers;

/** The disclosure (half a block), icon, label and trailing tracks every row lays out on. */
const DEFAULT_COLUMNS = 'var(--nx-half-block-size) var(--nx-block-size) minmax(0, 1fr) auto';

/** How long recorded pointer modifiers stay valid for the machine's selection callback. */
const MODIFIER_WINDOW = 500;

const NO_MODIFIERS: SelectModifiers = { option: false, shift: false, meta: false };

/** The keys held for a pointer event; `meta` covers ctrl on non-Mac keyboards. */
const modifiersOf = (event: { altKey: boolean; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => ({
  option: event.altKey,
  shift: event.shiftKey,
  meta: event.metaKey || event.ctrlKey,
});

/** Whether an event started on a real control inside a row, which keeps its own activation. */
const isInnerControl = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest('button, input, textarea, [contenteditable="true"]');

//
// Root
//

type TreeRootProps<T extends { id: string } = any> = {
  model: TreeModel<T>;
  /** The model node whose children are the top rows; `undefined` asks the model for its root. */
  rootId?: string;
  /** Prefix of every row's path, and the drag scope: trees sharing it accept each other's rows. */
  id: string;
  /**
   * Ancestors the rows' paths start from, ahead of `id` (e.g. a navtree workspace's own path); its first id is then
   * the drag scope, so trees mounted under one root (a tree per workspace tab) accept each other's rows.
   */
  path?: string[];
  size?: Next.Size;
  /**
   * Each row's grid template; the default is disclosure, icon, label and trailing tracks. A template that keeps
   * `Tree.ItemIndicator` starts with its `var(--nx-half-block-size)` track.
   */
  columns?: string;
  /**
   * Let a row grow past one block for cells placed on further grid lines (a description under the label): the first
   * line stays one block and later lines size to their content. A fixed window assumes one block per row, so pair it
   * with `virtual='variable'` or none.
   */
  multiline?: boolean;
  selectionMode?: 'single' | 'multiple';
  /** Move selection with the roving tabstop, for a list whose selection only highlights a row. */
  selectionFollowsFocus?: boolean;
  /** `fixed` windows the rows (each one block tall); `variable` skips painting rows out of view. */
  virtual?: TreeVirtual;
  draggable?: boolean;
  /**
   * The native drag preview: by default a `Next.DragPreview` chip with the row's icon and label; a renderer fills the
   * chip instead; `false` keeps the browser's snapshot of the row.
   */
  dragPreview?: boolean | ((item: T) => ReactNode);
  /** Whether a childless row offers a make-child zone; off where leaves are terminal (a navtree's documents). */
  leavesAcceptChildren?: boolean;
  /** Give an open branch a reorder-below zone meaning "after this row and its subtree", in place of `reparent` bands. */
  dropBelowExpanded?: boolean;
  /** Render a strip after the last row that accepts a drop meaning "append at the end". */
  dropAtEnd?: boolean;
  /** Take the dragged row out of the list for the drag, rather than fading it in place. */
  hideDragSource?: boolean;
  indentGuides?: boolean;
  /** Animate user-driven disclosure (never the initial or persisted open state); off under reduced motion. */
  animate?: boolean;
  /** Whether a row can be selected; activating a branch that cannot be toggles it instead. */
  canSelect?: (params: { item: T; path: string[] }) => boolean;
  canDrop?: TreeContextValue['canDrop'];
  getDropKind?: TreeContextValue['getDropKind'];
  onOpenChange?: (params: { item: T; path: string[]; open: boolean }) => void;
  /**
   * A row activation (click, Enter, or the machine's selection). Option-click on a branch toggles it instead, and a
   * click on the current row reports it again (the machine emits nothing for it).
   */
  onSelect?: (event: TreeSelectEvent<T>) => void;
  /** Pointer or drag entering a row, e.g. to prefetch its children before a hold opens it. */
  onItemHover?: (params: { item: T }) => void;
  /**
   * Keydown on the tree element, before the machine's. A key the consumer takes (`preventDefault`) on a row returns
   * focus to that row once the tree re-renders, found by id, since a restructuring key remounts it under a new path.
   */
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onDrop?: (event: TreeDropEvent<T>) => void;
  children?: ReactNode;
};

/**
 * Ark `TreeView.Root`, fully controlled from the model: `expandedValue`/`selectedValue` come from the walk, and the
 * machine's changes are reported through `onOpenChange`/`onSelect` for the model to apply. As in the current Tree a
 * click selects a row and does not toggle it, except a branch that cannot be selected and an option-click, which
 * toggle; the caret, ArrowLeft/Right and Space always toggle.
 */
const TreeRoot = <T extends { id: string }>({
  model,
  rootId,
  id,
  path,
  size,
  columns = DEFAULT_COLUMNS,
  multiline = false,
  selectionMode = 'single',
  selectionFollowsFocus = false,
  virtual,
  draggable = false,
  dragPreview = true,
  leavesAcceptChildren = false,
  dropBelowExpanded = false,
  dropAtEnd = false,
  hideDragSource = false,
  indentGuides = false,
  animate = true,
  canSelect,
  canDrop,
  getDropKind,
  onOpenChange,
  onSelect,
  onItemHover,
  onKeyDown,
  onDrop,
  children,
}: TreeRootProps<T>) => {
  const { t } = useTranslation();
  const rootPath = useMemo(() => (path ? [...path, id] : [id]), [path, id]);
  const treeId = rootPath[0];
  const walkAtom = useMemo(() => createTreeWalkAtom(model, rootId, rootPath), [model, rootId, rootPath]);
  const walk = useAtomValue(walkAtom);
  const walkRef = useRef<TreeWalk<T>>(walk);
  walkRef.current = walk;
  const collection = useMemo(
    () => createCollection(walk.root, (node) => toLocalizedString(node.props.label, t)),
    [walk.root, t],
  );
  const scrollToIndexRef = useRef<((index: number) => void) | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // The machine's callbacks carry no input modifiers, so the last pointer-down's are recorded and read (while fresh)
  // when selection changes.
  const modifiersRef = useRef<SelectModifiers & { at: number }>({ ...NO_MODIFIERS, at: 0 });
  const handlePointerDownCapture = useCallback((event: PointerEvent<HTMLDivElement>) => {
    modifiersRef.current = { ...modifiersOf(event), at: Date.now() };
  }, []);
  const recentModifiers = useCallback((): SelectModifiers => {
    const { option, shift, meta, at } = modifiersRef.current;
    return Date.now() - at < MODIFIER_WINDOW ? { option, shift, meta } : NO_MODIFIERS;
  }, []);

  //
  // Disclosure
  //

  // Only disclosures requested after mount are recorded, so rows rendered open from the start never animate.
  const [disclosures, setDisclosures] = useState<readonly TreeDisclosure[]>([]);
  const pendingRef = useRef(
    new Map<string, { disclosure: TreeDisclosure; timer: ReturnType<typeof setTimeout>; close?: () => void }>(),
  );
  // A close still concealing at unmount is committed, so the model does not lose it.
  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      pending.forEach(({ timer, close }) => {
        clearTimeout(timer);
        close?.();
      });
      pending.clear();
    };
  }, []);

  // A close commits after its animation (or on unmount), so it reads the latest callback rather than the one from the
  // render that started it.
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const setOpen = useCallback(
    (node: TreeNode<T>, open: boolean) => {
      const { item } = node;
      const commit = () => item && onOpenChangeRef.current?.({ item, path: node.path, open });
      const pending = pendingRef.current;
      const previous = pending.get(node.value);
      if (previous) {
        if (previous.disclosure.open === open) {
          return;
        }
        clearTimeout(previous.timer);
        pending.delete(node.value);
        setDisclosures((list) => list.filter((entry) => entry !== previous.disclosure));
        // Reopening a concealing branch: the model never closed it, so its rows just stop concealing.
        if (open) {
          return;
        }
      }

      const duration = animate && rootRef.current ? disclosureDuration(rootRef.current) : 0;
      if (duration <= 0) {
        return commit();
      }

      const disclosure: TreeDisclosure = { value: node.value, path: node.path, open };
      // Flushed before the commit: the model's update renders synchronously (an external store), so a batched phase
      // would land a commit after the rows it animates had already mounted at full height.
      flushSync(() => setDisclosures((list) => [...list, disclosure]));
      if (open) {
        commit();
      }
      pending.set(node.value, {
        disclosure,
        timer: setTimeout(() => {
          pending.delete(node.value);
          if (!open) {
            commit();
          }
          setDisclosures((list) => list.filter((entry) => entry !== disclosure));
        }, duration),
        close: open ? undefined : commit,
      });
    },
    [animate],
  );

  // A concealing branch is still open in the model, so a toggle mid-close reopens it.
  const toggleOpen = useCallback(
    (node: TreeNode<T>) => setOpen(node, pendingRef.current.get(node.value)?.disclosure.open === false || !node.open),
    [setOpen],
  );

  const handleExpandedChange = useCallback(
    ({ expandedValue }: { expandedValue: string[] }) => {
      const next = new Set(expandedValue);
      const previous = new Set(walk.expanded);
      for (const value of expandedValue) {
        const node = previous.has(value) ? undefined : walk.byValue.get(value);
        node && setOpen(node, true);
      }
      for (const value of walk.expanded) {
        const node = next.has(value) ? undefined : walk.byValue.get(value);
        node && setOpen(node, false);
      }
    },
    [walk, setOpen],
  );

  //
  // Selection
  //

  /** The consumer's verdict alone; a disabled row answers no activation at all, which is separate. */
  const allowsSelect = useCallback(
    (node: TreeNode<T>) => !!node.item && !node.group && (canSelect?.({ item: node.item, path: node.path }) ?? true),
    [canSelect],
  );

  const selectNode = useCallback(
    (node: TreeNode<T>, activation: RowActivation) => {
      if (node.disabled || node.group || !node.item) {
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

  const handleSelectionChange = useCallback(
    ({ selectedValue, focusedValue }: { selectedValue: string[]; focusedValue: string | null }) => {
      const previous = new Set(walk.selected);
      const value =
        focusedValue && selectedValue.includes(focusedValue)
          ? focusedValue
          : selectedValue.find((candidate) => !previous.has(candidate));
      const node = value ? walk.byValue.get(value) : undefined;
      node && selectNode(node, { ...recentModifiers(), current: true });
    },
    [walk, selectNode, recentModifiers],
  );

  //
  // Focus
  //

  // Controlled, so focus can be directed (a drop returns it to the row that moved) rather than only observed.
  const [focusedValue, setFocusedValue] = useState<string | null>(null);
  const focusedValueRef = useRef<string | null>(null);

  /**
   * A row awaiting DOM focus, with its id as well as its value: a drop that reparents the row changes its path, so the
   * value captured when the drag started may no longer match anything.
   */
  const pendingFocusRef = useRef<{ id: string; value: string; revealed?: boolean } | null>(null);

  const focusNode = useCallback((nodeId: string, value: string) => {
    pendingFocusRef.current = { id: nodeId, value };
    focusedValueRef.current = value;
    setFocusedValue(value);
  }, []);

  const claimFocus = useCallback((value: string, row: HTMLElement) => {
    if (pendingFocusRef.current?.value !== value) {
      return;
    }
    pendingFocusRef.current = null;
    // Only while focus is still where the drag or key left it: the reader may have clicked elsewhere meanwhile.
    const active = document.activeElement;
    if (!active || active === document.body || (rootRef.current?.contains(active) ?? false)) {
      row.focus();
    }
  }, []);

  // No dependency array: the render that lands a reorder is the one to follow, and which render that is depends on how
  // the consumer commits it. A row outside the window is scrolled to once, and claims focus itself when it mounts.
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) {
      return;
    }
    const value = walk.byValue.has(pending.value)
      ? pending.value
      : [...walk.byValue.values()].find((node) => node.id === pending.id)?.value;
    if (!value) {
      pendingFocusRef.current = null;
      return;
    }
    if (value !== pending.value) {
      pending.value = value;
      focusedValueRef.current = value;
      setFocusedValue(value);
    }
    const row = rootRef.current?.querySelector<HTMLElement>(`[data-tree-row][data-value="${CSS.escape(value)}"]`);
    if (row) {
      claimFocus(value, row);
    } else if (!pending.revealed && scrollToIndexRef.current) {
      const index = walk.rowIndex.get(value);
      if (index !== undefined) {
        pending.revealed = true;
        scrollToIndexRef.current(index);
      }
    }
  });

  const handleFocusChange = useCallback(
    ({ focusedValue }: { focusedValue: string | null }) => {
      focusedValueRef.current = focusedValue;
      setFocusedValue(focusedValue);
      if (pendingFocusRef.current?.value !== focusedValue) {
        pendingFocusRef.current = null;
      }
      if (!selectionFollowsFocus || !focusedValue || walk.selected.includes(focusedValue)) {
        return;
      }
      // A modified activation is the pointer's to report: the machine moves focus first.
      if (recentModifiers().meta) {
        return;
      }
      // Only the row's own focus selects; focus landing on a control inside it bubbles the same event.
      const active = document.activeElement;
      if (active && active !== document.body && active.closest('[data-tree-row]') !== active) {
        return;
      }
      const node = walk.byValue.get(focusedValue);
      node && selectNode(node, { ...NO_MODIFIERS, current: true });
    },
    [selectionFollowsFocus, walk, selectNode, recentModifiers],
  );

  // zag focuses a row a frame after asking for it to be scrolled to; a row the window has not mounted by then claims
  // focus when it mounts.
  const scrollToNode = useCallback(
    ({ index, node, getElement }: { index: number; node: TreeNode<T>; getElement: () => HTMLElement | null }) => {
      const rowIndex = walkRef.current.rowIndex.get(node.value) ?? index;
      scrollToIndexRef.current?.(rowIndex);
      if (!getElement()) {
        pendingFocusRef.current = { id: node.id, value: node.value };
      }
    },
    [],
  );

  //
  // Keyboard
  //

  /** Runs before the machine's handler: Enter re-reports a selected row (zag emits nothing) and Space toggles. */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      const target = event.target instanceof HTMLElement ? event.target : null;
      const row = target?.closest<HTMLElement>('[data-tree-row]');
      const value = row === target ? row?.getAttribute('data-value') : null;
      if (event.defaultPrevented) {
        // A consumer's restructuring key remounts the row under its new parent, and the unmount drops DOM focus.
        const node = value ? walk.byValue.get(value) : undefined;
        node && focusNode(node.id, node.value);
        return;
      }
      if ((event.key !== 'Enter' && event.key !== ' ') || isInnerControl(event.target)) {
        return;
      }
      const focused = value ?? focusedValueRef.current;
      const node = focused ? walk.byValue.get(focused) : undefined;
      if (!node || node.disabled) {
        return;
      }
      if (event.key === ' ') {
        if (node.branch) {
          event.preventDefault();
          toggleOpen(node);
        }
        return;
      }
      event.preventDefault();
      if (node.item && allowsSelect(node)) {
        onSelect?.({ item: node.item, path: node.path, current: true, ...NO_MODIFIERS, keyboard: true });
      } else if (node.branch) {
        toggleOpen(node);
      }
    },
    [onKeyDown, walk, focusNode, toggleOpen, allowsSelect, onSelect],
  );

  //
  // Drag and drop
  //

  // One monitor per tree: a windowed row can scroll out of the window mid-drag, and an unmounted row hears no drop.
  // A dragged open branch is collapsed for the drag and reopened after it. Read through refs, so the consumer
  // re-rendering on the collapse cannot resubscribe the monitor mid-drag.
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  useEffect(() => {
    if (!draggable) {
      return;
    }
    let drag: { node: TreeNode<T>; reopen: boolean } | undefined;
    return monitorForElements({
      canMonitor: ({ source }) => isTreeDataFor(source.data, treeId),
      onDragStart: ({ source }) => {
        const node =
          isTreeData(source.data) && rootRef.current?.contains(source.element)
            ? walkRef.current.byValue.get(Path.create(...source.data.path))
            : undefined;
        drag = node && { node, reopen: node.branch && node.open };
        if (drag?.reopen && drag.node.item) {
          onOpenChangeRef.current?.({ item: drag.node.item, path: drag.node.path, open: false });
        }
      },
      onDrop: ({ source, location }) => {
        const dragged = drag;
        drag = undefined;
        if (dragged?.reopen && dragged.node.item) {
          onOpenChangeRef.current?.({ item: dragged.node.item, path: dragged.node.path, open: true });
        }

        // Trees sharing a scope each hear the drop; the one holding the target reports it.
        const target = location.current.dropTargets[0];
        const owned = target && rootRef.current?.contains(target.element);
        const event = owned && isTreeData(source.data) ? dropEvent(walkRef.current, source.data, target.data) : null;
        event && onDropRef.current?.(event);
        // Return the roving tabstop to the row that moved: a drag leaves focus on the body, which restarts navigation
        // at the top. As controlled state it is simply the focused value once the reorder renders.
        dragged && focusNode(dragged.node.id, dragged.node.value);
      },
    });
  }, [draggable, treeId, focusNode]);

  const renderDragPreview = useMemo(
    () =>
      typeof dragPreview === 'function'
        ? (node: TreeNode<T>) => (node.item ? dragPreview(node.item) : null)
        : undefined,
    [dragPreview],
  );

  const handleItemHover = useCallback(
    (node: TreeNode<T>) => node.item && onItemHover?.({ item: node.item }),
    [onItemHover],
  );

  const style: CSSProperties & Record<'--nx-tree-columns', string> = { '--nx-tree-columns': columns };

  return (
    <TreeProvider
      treeId={treeId}
      walk={walk}
      virtual={virtual}
      draggable={draggable}
      dragPreview={dragPreview !== false}
      renderDragPreview={renderDragPreview}
      indentGuides={indentGuides}
      leavesAcceptChildren={leavesAcceptChildren}
      dropBelowExpanded={dropBelowExpanded}
      dropAtEnd={dropAtEnd}
      hideDragSource={hideDragSource}
      selectionMode={selectionMode}
      canDrop={canDrop}
      getDropKind={getDropKind}
      allowsSelect={allowsSelect}
      selectNode={selectNode}
      onItemHover={onItemHover ? handleItemHover : undefined}
      setOpen={setOpen}
      disclosures={disclosures}
      focusedValue={focusedValue}
      claimFocus={claimFocus}
      scrollToIndexRef={scrollToIndexRef}
      onTreeKeyDown={handleKeyDown}
      onTreePointerDownCapture={handlePointerDownCapture}
    >
      <TreeView.Root
        collection={collection}
        expandedValue={walk.expanded}
        selectedValue={walk.selected}
        focusedValue={focusedValue}
        selectionMode={selectionMode}
        expandOnClick={false}
        onExpandedChange={handleExpandedChange}
        onSelectionChange={handleSelectionChange}
        onFocusChange={handleFocusChange}
        scrollToIndexFn={virtual === 'fixed' ? scrollToNode : undefined}
        data-size={size}
        data-multiline={multiline ? '' : undefined}
        className='nx-tree'
        style={style}
        ref={rootRef}
      >
        {children}
      </TreeView.Root>
    </TreeProvider>
  );
};

TreeRoot.displayName = 'Tree.Root';

/**
 * The consumer's drop event for a drop target's data, or null when the drop does nothing. The end strip carries no
 * instruction, so it is read as "below the last top-level row" (or "into the root" when there are none).
 */
const dropEvent = (walk: TreeWalk, source: TreeData, data: Record<string | symbol, unknown>): TreeDropEvent | null => {
  if (data.atEnd === true && isTreeData(data)) {
    const last = walk.root.children?.at(-1);
    if (!last) {
      return {
        instruction: { type: 'make-child', currentLevel: 0, indentPerLevel: 0 },
        source,
        target: data,
        item: data.item,
        atEnd: true,
      };
    }
    const target: TreeData = { treeId: data.treeId, id: last.id, path: last.path, item: last.item };
    return {
      instruction: { type: 'reorder-below', currentLevel: last.depth, indentPerLevel: 0 },
      source,
      target,
      item: last.item,
      atEnd: true,
    };
  }
  const instruction = extractInstruction(data);
  if (!instruction || instruction.type === 'instruction-blocked' || !isTreeData(data)) {
    return null;
  }
  return { instruction, source, target: data, item: data.item };
};

/** The disclosure duration the tree's CSS resolves (the theme token, 0 under reduced motion), in milliseconds. */
const disclosureDuration = (element: HTMLElement): number => {
  const value = getComputedStyle(element).getPropertyValue('--nx-tree-disclosure-duration').trim();
  const duration = Number.parseFloat(value);
  return Number.isNaN(duration) ? 0 : value.endsWith('ms') ? duration : duration * 1000;
};

/** Whether `path` lies strictly under `ancestor`. */
const isDescendant = (path: string[], ancestor: string[]) =>
  path.length > ancestor.length && ancestor.every((id, index) => path[index] === id);

/** A row's disclosure phase: a conceal outranks an enter, since a row under a closing branch leaves with it. */
const useDisclosurePhase = (node: TreeNode): 'enter' | 'conceal' | undefined => {
  const { disclosures } = useTreeContext('Tree.Item');
  const under = disclosures.filter((disclosure) => isDescendant(node.path, disclosure.path));
  return under.some(({ open }) => !open) ? 'conceal' : under.length > 0 ? 'enter' : undefined;
};

//
// Label
//

type TreeLabelProps = ComponentPropsWithoutRef<typeof TreeView.Label> & {
  /** Names the tree for assistive tech only, for a tree whose surroundings already title it. */
  srOnly?: boolean;
};

/** The machine's own label part, which it already points `aria-labelledby` at. */
const TreeLabel = forwardRef<HTMLHeadingElement, TreeLabelProps>(({ srOnly, ...props }, forwardedRef) => (
  <TreeView.Label {...props} data-sr-only={srOnly ? '' : undefined} className='nx-tree-label' ref={forwardedRef} />
));

TreeLabel.displayName = 'Tree.Label';

//
// Content
//

/**
 * Ark's `tree` element carrying Container attributes, so the ScrollArea viewport slot merges onto it and the tree
 * element itself scrolls (part-naming rules 1 and 2).
 */
const TreeContentElement = composable<HTMLDivElement, {}>(({ children, ...props }, forwardedRef) => {
  const { onTreeKeyDown, onTreePointerDownCapture } = useTreeContext('Tree.Content');
  const { className, ...rest } = composableProps(props, { classNames: 'nx-grid nx-tree-content' });
  return (
    <TreeView.Tree
      {...rest}
      data-scope='tree-view'
      data-part='tree'
      data-gutter='inset'
      data-layout='stack'
      data-gap='none'
      className={className}
      onKeyDown={onTreeKeyDown}
      onPointerDownCapture={onTreePointerDownCapture}
      ref={forwardedRef}
    >
      {children}
    </TreeView.Tree>
  );
});

type TreeContentProps = {
  /**
   * Renders one row (the default is `<Tree.Item node={node} />`), group headers included (`node.group`, which
   * `Tree.Item` renders as `Tree.ItemGroup`); other children (e.g. `Tree.Empty`) render after the rows.
   */
  children?: ReactNode | ((node: TreeNode) => ReactNode);
};

const renderDefaultRow = (node: TreeNode) => <TreeItem node={node} />;

/** The rows a fixed window measures its pitch from: an animating row is mid-way between zero and one block. */
const SETTLED_ROWS = ':is([data-tree-row], [data-tree-group]):not([data-disclosure])';

/**
 * The tree element as the viewport of a thin ScrollArea. Rows are rendered flat in visible (pre-order) order, never
 * nested in `BranchContent`: zag navigates the collection rather than the DOM, so the flat list serves both the whole
 * tree and a window of it, and `aria-level`/`aria-expanded` carry the hierarchy.
 */
const TreeContent = ({ children }: TreeContentProps) => {
  const { treeId, walk, virtual, scrollToIndexRef, focusedValue, draggable, dropAtEnd } =
    useTreeContext('Tree.Content');
  const renderRow = typeof children === 'function' ? children : renderDefaultRow;
  const trailing = typeof children === 'function' ? null : children;
  const { rows } = walk;
  const windowed = virtual === 'fixed';
  const focused = windowed && focusedValue ? walk.rowIndex.get(focusedValue) : undefined;
  const windowing = Next.useVirtualRows({
    mode: virtual,
    count: rows.length,
    pinned: focused,
    measure: SETTLED_ROWS,
  });

  useEffect(() => {
    if (!windowed) {
      return;
    }
    scrollToIndexRef.current = windowing.scrollToIndex;
    return () => {
      scrollToIndexRef.current = null;
    };
  }, [windowed, windowing.scrollToIndex, scrollToIndexRef]);

  // Spacers stand in for the rows between spans, so the scroll extent is the whole tree's.
  const content: ReactNode[] = [];
  let next = 0;
  for (const span of windowing.spans) {
    content.push(<Next.VirtualSpacer key={`gap-${next}`} height={windowing.spacer(span.first - next)} />);
    for (let index = span.first; index <= span.last; index++) {
      const node = rows[index];
      content.push(<Fragment key={node.value}>{renderRow(node)}</Fragment>);
    }
    next = span.last + 1;
  }
  content.push(<Next.VirtualSpacer key={`gap-${next}`} height={windowing.spacer(rows.length - next)} />);

  return (
    <Next.ScrollArea.Root>
      <Next.ScrollArea.Viewport asChild>
        <TreeContentElement ref={windowing.listRef}>
          {content}
          {draggable && dropAtEnd && <TreeEndDropTarget treeId={treeId} root={walk.root} />}
          {trailing}
        </TreeContentElement>
      </Next.ScrollArea.Viewport>
    </Next.ScrollArea.Root>
  );
};

TreeContent.displayName = 'Tree.Content';

/**
 * A strip after the last row that takes a drop meaning "append at the end". Rows are sticky drop targets, so without
 * it a drop in the empty space below the list applies whatever the last row was showing.
 */
const TreeEndDropTarget = ({ treeId, root }: { treeId: string; root: TreeNode }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [over, setOver] = useState(false);
  const rootId = root.id;
  const rootPath = root.path;
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const data: TreeData = { treeId, id: rootId, path: rootPath, item: { id: rootId } };
    return dropTargetForElements({
      element,
      getData: () => ({ ...data, atEnd: true }),
      canDrop: ({ source }) => isTreeDataFor(source.data, treeId),
      onDragEnter: () => setOver(true),
      onDragLeave: () => setOver(false),
      onDrop: () => setOver(false),
    });
  }, [treeId, rootId, rootPath]);

  return (
    <div
      ref={ref}
      role='none'
      data-tree-end=''
      data-drop-target={over ? 'top' : undefined}
      className='nx-tree-end'
    ></div>
  );
};

//
// Item
//

type TreeItemProps = {
  node: TreeNode;
  /**
   * Replaces the default row (`ItemIndicator`, `ItemIcon`, `ItemText`, `ItemCount`); compose from those parts and
   * trailing controls. Ignored for a group header, which renders `Tree.ItemGroup`.
   */
  children?: ReactNode;
};

/** One row: a group header (`node.group`) renders as `Tree.ItemGroup`, anything else as a tree item. */
const TreeItem = ({ node, children }: TreeItemProps) =>
  node.group ? <TreeItemGroup node={node} /> : <TreeItemRow node={node}>{children}</TreeItemRow>;

TreeItem.displayName = 'Tree.Item';

type DragState = { instruction: Instruction | null; kind: DropKind; dragging: boolean };

/** Where the drop line or ring goes (`data-drop-target`), and the level a line is drawn at. */
const dropTarget = (instruction: Instruction | null): { target?: 'top' | 'bottom' | 'inside'; level?: number } => {
  switch (instruction?.type) {
    case 'reorder-above':
      return { target: 'top', level: instruction.currentLevel };
    case 'reorder-below':
      return { target: 'bottom', level: instruction.currentLevel };
    case 'reparent':
      return { target: 'bottom', level: instruction.desiredLevel };
    case 'make-child':
      return { target: 'inside' };
    default:
      return {};
  }
};

/**
 * A row: Ark's `BranchControl` (inside a `display: contents` `Branch`, which carries the `treeitem` role) or `Item`,
 * laid out as a Container row on the Root's `columns`, indented by one block per level. Rows are drag sources and drop
 * targets when the Root is `draggable`; the target state is `data-drop-target` (`top`, `bottom` or `inside`).
 */
const TreeItemRow = ({ node, children }: TreeItemProps) => {
  const {
    treeId,
    virtual,
    draggable,
    dragPreview,
    renderDragPreview,
    indentGuides,
    leavesAcceptChildren,
    dropBelowExpanded,
    hideDragSource,
    selectionMode,
    canDrop,
    getDropKind,
    allowsSelect,
    selectNode,
    onItemHover,
    setOpen,
    disclosures,
    claimFocus,
  } = useTreeContext('Tree.Item');
  const { t } = useTranslation();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState>({ instruction: null, kind: 'move', dragging: false });
  const { id, value, path, item, depth, branch, open, last, current, props } = node;
  const canDrag = draggable && props.draggable !== false;
  const canBeTarget = draggable && props.droppable !== false;
  const label = toLocalizedString(props.label, t);
  // `expanded` drops the reorder-below zone, because below an open branch and its first child are the same place;
  // `last-in-group` offers the `reparent` bands that move a row out to a shallower level.
  const mode: ItemMode = branch && open && !dropBelowExpanded ? 'expanded' : last ? 'last-in-group' : 'standard';

  useEffect(() => {
    const element = rowRef.current;
    if (!element || (!canDrag && !canBeTarget)) {
      return;
    }
    const data: TreeData = { treeId, id, path, item };
    let expandTimer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      clearTimeout(expandTimer);
      expandTimer = undefined;
      setDrag((state) => ({ ...state, instruction: null }));
    };
    const updateTarget = ({ self, source }: ElementDropTargetEventBasePayload) => {
      const desired = extractInstruction(self.data);
      const kind =
        desired && desired.type !== 'instruction-blocked' && isTreeData(source.data)
          ? (getDropKind?.({ instruction: desired, source: source.data, target: data }) ?? 'move')
          : 'move';
      const instruction: Instruction | null =
        kind === 'reject' && desired && desired.type !== 'instruction-blocked'
          ? { type: 'instruction-blocked', desired }
          : desired;
      // Holding over a closed branch's centre opens it, as the current Tree does.
      if (instruction?.type === 'make-child' && branch && !open && !expandTimer) {
        expandTimer = setTimeout(() => setOpen(node, true), 500);
      } else if (instruction?.type !== 'make-child') {
        clearTimeout(expandTimer);
        expandTimer = undefined;
      }
      setDrag((state) => ({ ...state, instruction, kind }));
    };
    // pragmatic-dnd never sets `effectAllowed`, so over the source row the browser falls back to its copy cursor.
    const handleNativeDragStart = (event: DragEvent) => {
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
      }
    };

    const cleanups: (() => void)[] = [() => clearTimeout(expandTimer)];
    if (canDrag) {
      element.addEventListener('dragstart', handleNativeDragStart);
      cleanups.push(
        () => element.removeEventListener('dragstart', handleNativeDragStart),
        makeDraggable({
          element,
          getInitialData: () => data,
          onGenerateDragPreview: dragPreview
            ? ({ nativeSetDragImage, source }) =>
                setCustomNativeDragPreview({
                  nativeSetDragImage,
                  getOffset: ({ container }) => ({ x: 20, y: container.getBoundingClientRect().height / 2 }),
                  render: ({ container }) => {
                    // Filled synchronously: the browser snapshots the preview when `dragstart` returns.
                    const root = createRoot(container);
                    flushSync(() =>
                      root.render(
                        <Next.DragPreview source={source.element}>
                          {renderDragPreview ? renderDragPreview(node) : <span className='truncate'>{label}</span>}
                        </Next.DragPreview>,
                      ),
                    );
                    // The preview's own root has no icon registry; the row's icon is already resolved, so it is copied.
                    const icon = source.element.querySelector('.nx-tree-item-icon svg');
                    if (!renderDragPreview && icon) {
                      container.firstElementChild?.prepend(icon.cloneNode(true));
                    }
                    return () => root.unmount();
                  },
                })
            : undefined,
          onDragStart: () => setDrag((state) => ({ ...state, dragging: true })),
          onDrop: () => setDrag((state) => ({ ...state, dragging: false })),
        }),
      );
    }
    if (canBeTarget) {
      cleanups.push(
        dropTargetForElements({
          element,
          getData: ({ input, element }) =>
            attachInstruction(data, {
              input,
              element,
              indentPerLevel: element.getBoundingClientRect().height,
              currentLevel: depth,
              mode,
              block: branch || leavesAcceptChildren ? [] : ['make-child'],
            }),
          canDrop: ({ source }) =>
            source.element !== element &&
            isTreeDataFor(source.data, treeId) &&
            (canDrop?.({ source: source.data, target: data }) ?? true),
          getIsSticky: () => true,
          // Enter as well as drag: the first `onDrag` waits for a frame, so a quick pass would show no target. A native
          // drag fires no mouseenter, so the hover prefetch runs here too.
          onDragEnter: (payload) => {
            onItemHover?.(node);
            updateTarget(payload);
          },
          onDrag: updateTarget,
          onDragLeave: clear,
          onDrop: clear,
        }),
      );
    }
    return combine(...cleanups);
  }, [
    canDrag,
    canBeTarget,
    dragPreview,
    renderDragPreview,
    treeId,
    node,
    id,
    path,
    item,
    depth,
    branch,
    open,
    mode,
    label,
    leavesAcceptChildren,
    canDrop,
    getDropKind,
    onItemHover,
    setOpen,
  ]);

  // A row the tree is waiting to focus (after a drop, or a windowed jump) may only now be mounted.
  useEffect(() => {
    rowRef.current && claimFocus(value, rowRef.current);
  }, [value, claimFocus]);

  // The machine emits no selection for a row that is already selected, so a click on it is reported here.
  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (current && !isInnerControl(event.target)) {
        event.preventDefault();
        selectNode(node, { ...modifiersOf(event), current: true });
      }
    },
    [current, node, selectNode],
  );

  // In `multiple` mode a plain click selects the row alone and a meta-click toggles it, which the machine's own
  // multiple selection (click adds) does not.
  const handleClickCapture = useCallback(
    (event: MouseEvent) => {
      if (selectionMode !== 'multiple' || event.shiftKey || event.altKey || isInnerControl(event.target)) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      const meta = event.metaKey || event.ctrlKey;
      selectNode(node, { option: false, shift: false, meta, current: meta ? !current : true });
    },
    [selectionMode, node, current, selectNode],
  );

  const handleMouseEnter = useCallback(() => onItemHover?.(node), [onItemHover, node]);

  const phase = useDisclosurePhase(node);
  const concealing = disclosures.some((disclosure) => !disclosure.open && disclosure.value === value);
  const drop = dropTarget(drag.instruction);

  const style: CSSProperties & Record<`--${string}`, string> = {
    '--nx-columns': 'var(--nx-tree-columns)',
    '--nx-tree-depth': String(depth - 1),
    ...(drop.level !== undefined ? { '--nx-tree-drop-level': String(drop.level - 1) } : {}),
  };
  const rowProps = {
    'data-tree-row': '',
    'data-object-id': id,
    'data-gutter': 'inherit',
    'data-layout': 'row',
    'data-columns': '',
    'data-virtual': virtual === 'variable' ? 'variable' : undefined,
    'data-selectable': !props.disabled && allowsSelect(node) ? '' : undefined,
    'data-dragging': drag.dragging ? '' : undefined,
    'data-hide-drag-source': drag.dragging && hideDragSource ? '' : undefined,
    'data-drop-target': drop.target,
    'data-drop-kind': drop.target ? drag.kind : undefined,
    'data-disclosure': phase,
    'data-concealing': concealing ? '' : undefined,
    'data-testid': props.testId,
    'onClick': handleClick,
    'onClickCapture': handleClickCapture,
    'onMouseEnter': handleMouseEnter,
    style,
    'className': 'nx-grid nx-row nx-tree-item',
  };

  const content = (
    <>
      {children ?? (
        <>
          <TreeItemIndicator />
          <TreeItemIcon />
          <TreeItemText />
          <TreeItemCount />
        </>
      )}
      {indentGuides &&
        Array.from({ length: depth - 1 }, (_, level) => (
          <span key={level} aria-hidden='true' className='nx-tree-indent-guide' style={guideStyle(level)} />
        ))}
    </>
  );

  return (
    <TreeItemProvider node={node}>
      <TreeView.NodeProvider node={node} indexPath={node.indexPath}>
        {branch ? (
          <TreeView.Branch className='contents'>
            <TreeView.BranchControl {...rowProps} ref={rowRef}>
              {content}
            </TreeView.BranchControl>
          </TreeView.Branch>
        ) : (
          <TreeView.Item {...rowProps} ref={rowRef}>
            {content}
          </TreeView.Item>
        )}
      </TreeView.NodeProvider>
    </TreeItemProvider>
  );
};

TreeItemRow.displayName = 'Tree.ItemRow';

/** Each indent guide's column, as a typed custom property rather than a cast of `style`. */
const guideStyle = (level: number): CSSProperties & Record<'--nx-tree-guide-level', string> => ({
  '--nx-tree-guide-level': String(level),
});

//
// ItemGroup
//

type TreeItemGroupProps = {
  node: TreeNode;
  /** Replaces the default `Tree.ItemGroupLabel`. */
  children?: ReactNode;
};

/**
 * A section header (`disposition: 'group'`): one block tall like every row, outside the collection, so the keyboard
 * and typeahead skip it; its items follow it at its own level. Presentational, since a heading is not a permitted
 * child of `role=tree` and each item stays individually labelled.
 */
const TreeItemGroup = ({ node, children }: TreeItemGroupProps) => {
  const phase = useDisclosurePhase(node);
  const style: CSSProperties & Record<'--nx-tree-depth', string> = { '--nx-tree-depth': String(node.depth - 1) };
  return (
    <TreeItemProvider node={node}>
      <div
        role='presentation'
        data-tree-group=''
        data-object-id={node.id}
        data-disclosure={phase}
        data-testid={node.props.testId}
        className='nx-tree-group'
        style={style}
      >
        {children ?? <TreeItemGroupLabel />}
      </div>
    </TreeItemProvider>
  );
};

TreeItemGroup.displayName = 'Tree.ItemGroup';

type TreeItemGroupLabelProps = {
  /** Replaces the model's label. */
  children?: ReactNode;
};

/** The group's label (`itemProps.label`, translated). */
const TreeItemGroupLabel = ({ children }: TreeItemGroupLabelProps) => {
  const { node } = useTreeItemContext('Tree.ItemGroupLabel');
  const { t } = useTranslation();
  return (
    <Next.Typography truncate classNames='nx-tree-group-label'>
      {children ?? toLocalizedString(node.props.label, t)}
    </Next.Typography>
  );
};

TreeItemGroupLabel.displayName = 'Tree.ItemGroupLabel';

//
// ItemIndicator
//

type TreeItemIndicatorProps = {
  /** The caret glyph; it turns a quarter while the branch is open. */
  icon?: string;
};

/**
 * The disclosure cell: half a block wide and one block tall, holding the caret-only branch trigger on a branch (dimmed once an
 * open branch proves empty) and nothing on a leaf, so labels
 * align at every level.
 */
const TreeItemIndicator = ({ icon = 'ph--caret-right--regular' }: TreeItemIndicatorProps) => {
  const { node } = useTreeItemContext('Tree.ItemIndicator');
  return (
    <Next.Block classNames='nx-tree-item-indicator'>
      {node.branch && (
        <TreeView.BranchTrigger className='nx-tree-branch-trigger' data-empty={node.empty ? '' : undefined}>
          <TreeView.BranchIndicator className='nx-tree-branch-indicator'>
            <Next.Icon icon={icon} />
          </TreeView.BranchIndicator>
        </TreeView.BranchTrigger>
      )}
    </Next.Block>
  );
};

TreeItemIndicator.displayName = 'Tree.ItemIndicator';

//
// ItemIcon
//

type TreeItemIconProps = Partial<ComponentPropsWithoutRef<typeof Next.Icon>> & {
  /** Replaces the Icon in the cell, for a glyph that carries its own state (a tooltip, an animation, a per-state hue). */
  children?: ReactNode;
};

const ICON_HUES: readonly string[] = ['neutral', 'success', 'info', 'warning', 'error', ...hues];

/** Narrows the model's free-form `iconHue` to a hue the Icon can draw. */
const isIconHue = (value: string | undefined): value is Next.IconHue => !!value && ICON_HUES.includes(value);

/**
 * The icon cell: one block holding the row's icon (`itemProps.icon`, hued by `itemProps.iconHue`), or `children` in
 * its place. Forwards Icon's props, so `icon` and `hue` override the model's; the cell stays empty without an icon,
 * keeping labels aligned.
 */
const TreeItemIcon = ({ icon, hue, children, ...props }: TreeItemIconProps) => {
  const { node } = useTreeItemContext('Tree.ItemIcon');
  const glyph = icon ?? node.props.icon;
  const iconHue = node.props.iconHue;
  return (
    <Next.Block classNames='nx-tree-item-icon'>
      {children ??
        (glyph && <Next.Icon {...props} icon={glyph} hue={hue ?? (isIconHue(iconHue) ? iconHue : undefined)} />)}
    </Next.Block>
  );
};

TreeItemIcon.displayName = 'Tree.ItemIcon';

//
// ItemText
//

type TreeItemTextProps = {
  /** Replaces the model's label. */
  'children'?: ReactNode;
  'data-testid'?: string;
};

/** The row's label (`itemProps.label`, translated), truncated to one line. */
const TreeItemText = ({ children, 'data-testid': testId }: TreeItemTextProps) => {
  const { node } = useTreeItemContext('Tree.ItemText');
  const { t } = useTranslation();
  return (
    <Next.Typography truncate classNames='nx-tree-item-text' data-testid={testId}>
      {children ?? toLocalizedString(node.props.label, t)}
    </Next.Typography>
  );
};

TreeItemText.displayName = 'Tree.ItemText';

//
// ItemCount
//

/**
 * The row's count badge in the trailing column: `itemProps.modifiedCount` (new or unread) as a rose tag when positive,
 * else `itemProps.count` as a neutral one; nothing without either.
 */
const TreeItemCount = () => {
  const { node } = useTreeItemContext('Tree.ItemCount');
  const { count, modifiedCount } = node.props;
  if (typeof modifiedCount === 'number' && modifiedCount > 0) {
    return (
      <Next.Tag hue='rose' classNames='nx-tree-item-count'>
        {modifiedCount}
      </Next.Tag>
    );
  }
  if (typeof count === 'number') {
    return (
      <Next.Tag hue='neutral' classNames='nx-tree-item-count'>
        {count}
      </Next.Tag>
    );
  }
  // Holds the count's track even when empty, so the cells after it (actions, item end) keep their own columns.
  return <span role='none' />;
};

TreeItemCount.displayName = 'Tree.ItemCount';

//
// ItemActions
//

type TreeItemActionsProps = {
  children?: ReactNode;
};

/**
 * Trailing row controls (e.g. an actions menu), each in its own track. Where the pointer can hover they show only on
 * the row in play: hovered, focused within, selected, or holding an open menu.
 */
const TreeItemActions = ({ children }: TreeItemActionsProps) => (
  <div role='none' data-scope='tree-view' data-part='item-actions' className='nx-tree-item-actions'>
    {children}
  </div>
);

TreeItemActions.displayName = 'Tree.ItemActions';

//
// Empty
//

type TreeEmptyProps = {
  /** A Phosphor icon above the message. */
  icon?: string;
  /** The message; the default is the translated "No items". */
  children?: ReactNode;
};

/** `Next.Empty` (its text the children or the translated "No items"), rendered only while the root has no children. */
const TreeEmpty = forwardRef<HTMLDivElement, TreeEmptyProps>((props, forwardedRef) => {
  const { walk } = useTreeContext('Tree.Empty');
  return walk.rows.length === 0 ? <Next.Empty {...props} ref={forwardedRef} /> : null;
});

TreeEmpty.displayName = 'Tree.Empty';

//
// Namespace
//

/**
 * Hierarchical list on Ark's tree-view, driven by `TreeModel` atoms, with Ark's part names on the Next row vocabulary:
 * `Root` (model, `virtual`, `animate`, activation policy, drag and drop), `Label`, `Content` (the scrolling tree
 * element; a row renderer as children), `Item` (one row), `ItemIndicator` (caret), `ItemIcon`, `ItemText`,
 * `ItemCount`, `ItemActions` (trailing controls shown on the row in play), `ItemGroup`/`ItemGroupLabel` (section
 * headers) and `Empty`.
 */
export const Tree = {
  Root: TreeRoot,
  Label: TreeLabel,
  Content: TreeContent,
  Item: TreeItem,
  ItemIndicator: TreeItemIndicator,
  ItemIcon: TreeItemIcon,
  ItemText: TreeItemText,
  ItemCount: TreeItemCount,
  ItemActions: TreeItemActions,
  ItemGroup: TreeItemGroup,
  ItemGroupLabel: TreeItemGroupLabel,
  Empty: TreeEmpty,
};

export type {
  TreeContentProps,
  TreeEmptyProps,
  TreeItemActionsProps,
  TreeItemGroupLabelProps,
  TreeItemGroupProps,
  TreeItemIconProps,
  TreeItemIndicatorProps,
  TreeItemProps,
  TreeItemTextProps,
  TreeLabelProps,
  TreeRootProps,
};
