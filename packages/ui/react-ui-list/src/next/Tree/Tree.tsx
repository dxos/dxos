//
// Copyright 2026 DXOS.org
//

// The next Tree on Ark's tree-view, fed by `TreeModel` atoms (AUDIT §6 group D point 2). zag owns focus, the APG
// keymap, typeahead, expansion and selection state; this file owns the lazy walk (tree-collection.ts), windowing, the
// Next row layout and pragmatic-drag-and-drop.

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
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { log } from '@dxos/log';
import { composable, composableProps, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Next, type Size } from '@dxos/react-ui/next';
import { hues } from '@dxos/ui-types';

import { type TreeData, isTreeData, isTreeDataFor } from '../../components/Tree/tree-data.ts';
import { type TreeModel } from '../../components/Tree/TreeContext.ts';
import { type DropKind } from '../../components/Tree/TreeDropIndicator.tsx';
import { type TreeNode, createCollection, createTreeWalkAtom } from './tree-collection.ts';
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
};

/** The disclosure, icon, label and trailing tracks every row lays out on. */
const DEFAULT_COLUMNS = 'var(--nx-block-size) var(--nx-block-size) minmax(0, 1fr) auto';

//
// Root
//

type TreeRootProps<T extends { id: string } = any> = {
  model: TreeModel<T>;
  /** The model node whose children are the top rows; `undefined` asks the model for its root. */
  rootId?: string;
  /** Prefix of every row's path, and the drag scope: trees sharing it accept each other's rows. */
  id: string;
  size?: Size;
  /** Each row's grid template; the default is disclosure, icon, label and trailing tracks. */
  columns?: string;
  selectionMode?: 'single' | 'multiple';
  /** `fixed` windows the rows (each one block tall); `variable` skips painting rows out of view. */
  virtual?: TreeVirtual;
  draggable?: boolean;
  /**
   * The native drag preview: by default a `Next.DragPreview` chip with the row's icon and label; a renderer fills the
   * chip instead; `false` keeps the browser's snapshot of the row.
   */
  dragPreview?: boolean | ((item: T) => ReactNode);
  indentGuides?: boolean;
  /** Animate user-driven disclosure (never the initial or persisted open state); off under reduced motion. */
  animate?: boolean;
  canDrop?: TreeContextValue['canDrop'];
  getDropKind?: TreeContextValue['getDropKind'];
  onOpenChange?: (params: { item: T; path: string[]; open: boolean }) => void;
  onSelect?: (params: { item: T; path: string[]; current: boolean }) => void;
  onDrop?: (event: TreeDropEvent<T>) => void;
  children?: ReactNode;
};

/**
 * Ark `TreeView.Root`, fully controlled from the model: `expandedValue`/`selectedValue` come from the walk, and the
 * machine's changes are reported through `onOpenChange`/`onSelect` for the model to apply. Only the caret toggles a
 * branch (`expandOnClick` is off), so a click on a row selects it.
 */
const TreeRoot = <T extends { id: string }>({
  model,
  rootId,
  id,
  size,
  columns = DEFAULT_COLUMNS,
  selectionMode = 'single',
  virtual,
  draggable = false,
  dragPreview = true,
  indentGuides = false,
  animate = true,
  canDrop,
  getDropKind,
  onOpenChange,
  onSelect,
  onDrop,
  children,
}: TreeRootProps<T>) => {
  const { t } = useTranslation();
  const walkAtom = useMemo(() => createTreeWalkAtom(model, rootId, [id]), [model, rootId, id]);
  const walk = useAtomValue(walkAtom);
  const collection = useMemo(
    () => createCollection(walk.root, (node) => toLocalizedString(node.props.label, t)),
    [walk.root, t],
  );
  const scrollToIndexRef = useRef<((index: number) => void) | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

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

  const setOpen = useCallback(
    (node: TreeNode<T>, open: boolean) => {
      const { item } = node;
      const commit = () => item && onOpenChange?.({ item, path: node.path, open });
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
    [animate, onOpenChange],
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

  const handleSelectionChange = useCallback(
    ({ selectedValue }: { selectedValue: string[] }) => {
      const next = new Set(selectedValue);
      const previous = new Set(walk.selected);
      for (const value of selectedValue) {
        const node = previous.has(value) ? undefined : walk.byValue.get(value);
        node?.item && onSelect?.({ item: node.item, path: node.path, current: true });
      }
      for (const value of walk.selected) {
        const node = next.has(value) ? undefined : walk.byValue.get(value);
        node?.item && onSelect?.({ item: node.item, path: node.path, current: false });
      }
    },
    [walk, onSelect],
  );

  // One monitor per tree: a windowed row can scroll out of the window mid-drag, and an unmounted row hears no drop.
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  useEffect(() => {
    if (!draggable) {
      return;
    }
    return monitorForElements({
      canMonitor: ({ source }) => isTreeDataFor(source.data, id),
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0];
        const instruction = target && extractInstruction(target.data);
        if (!target || !instruction || instruction.type === 'instruction-blocked') {
          return;
        }
        const { data: targetData } = target;
        if (!isTreeData(targetData) || !isTreeData(source.data)) {
          return;
        }
        onDropRef.current?.({
          instruction,
          source: source.data,
          target: targetData,
          item: targetData.item,
        });
      },
    });
  }, [draggable, id]);

  const renderDragPreview = useMemo(
    () =>
      typeof dragPreview === 'function'
        ? (node: TreeNode<T>) => (node.item ? dragPreview(node.item) : null)
        : undefined,
    [dragPreview],
  );

  const style: CSSProperties & Record<'--nx-tree-columns', string> = { '--nx-tree-columns': columns };

  return (
    <TreeProvider
      treeId={id}
      walk={walk}
      virtual={virtual}
      draggable={draggable}
      dragPreview={dragPreview !== false}
      renderDragPreview={renderDragPreview}
      indentGuides={indentGuides}
      canDrop={canDrop}
      getDropKind={getDropKind}
      setOpen={setOpen}
      disclosures={disclosures}
      scrollToIndexRef={scrollToIndexRef}
    >
      <TreeView.Root
        collection={collection}
        expandedValue={walk.expanded}
        selectedValue={walk.selected}
        selectionMode={selectionMode}
        expandOnClick={false}
        onExpandedChange={handleExpandedChange}
        onSelectionChange={handleSelectionChange}
        scrollToIndexFn={virtual === 'fixed' ? ({ index }) => scrollToIndexRef.current?.(index) : undefined}
        data-size={size}
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

/** The disclosure duration the tree's CSS resolves (the theme token, 0 under reduced motion), in milliseconds. */
const disclosureDuration = (element: HTMLElement): number => {
  const value = getComputedStyle(element).getPropertyValue('--nx-tree-disclosure-duration').trim();
  const duration = Number.parseFloat(value);
  return Number.isNaN(duration) ? 0 : value.endsWith('ms') ? duration : duration * 1000;
};

/** Whether `path` lies strictly under `ancestor`. */
const isDescendant = (path: string[], ancestor: string[]) =>
  path.length > ancestor.length && ancestor.every((id, index) => path[index] === id);

//
// Label
//

type TreeLabelProps = ComponentPropsWithoutRef<typeof TreeView.Label>;

/** The machine's own label part, which it already points `aria-labelledby` at. */
const TreeLabel = forwardRef<HTMLHeadingElement, TreeLabelProps>((props, forwardedRef) => (
  <TreeView.Label {...props} className='nx-tree-label' ref={forwardedRef} />
));

TreeLabel.displayName = 'Tree.Label';

//
// Content
//

/** Rows mounted beyond each edge of the view, so a fast wheel does not show blank rows. */
const OVERSCAN = 8;

/** A row's extent before one has been measured: the `md` block. */
const NOMINAL_BLOCK = 32;

/**
 * Ark's `tree` element carrying Container attributes, so the ScrollArea viewport slot merges onto it and the tree
 * element itself scrolls (part-naming rules 1 and 2).
 */
const TreeContentElement = composable<HTMLDivElement, {}>(({ children, ...props }, forwardedRef) => {
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
      ref={forwardedRef}
    >
      {children}
    </TreeView.Tree>
  );
});

type TreeContentProps = {
  /**
   * Renders one row (the default is `<Tree.Item node={node} />`); other children (e.g. `Tree.Empty`) render after the
   * default rows inside the tree element.
   */
  children?: ReactNode | ((node: TreeNode) => ReactNode);
};

const renderDefaultRow = (node: TreeNode) => <TreeItem node={node} />;

/**
 * The tree element as the viewport of a thin ScrollArea. Rows are rendered flat in visible (pre-order) order, never
 * nested in `BranchContent`: zag navigates the collection rather than the DOM, so the flat list serves both the whole
 * tree and a window of it, and `aria-level`/`aria-expanded` carry the hierarchy.
 */
const TreeContent = ({ children }: TreeContentProps) => {
  const { walk, virtual, scrollToIndexRef } = useTreeContext('Tree.Content');
  const renderRow = typeof children === 'function' ? children : renderDefaultRow;
  const trailing = typeof children === 'function' ? null : children;
  const { rows } = walk;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const blockRef = useRef(NOMINAL_BLOCK);
  const warnedRef = useRef(false);
  const pendingFocusRef = useRef<string | null>(null);
  const windowed = virtual === 'fixed';
  const [range, setRange] = useState({ first: 0, last: windowed ? 2 * OVERSCAN : rows.length - 1 });

  const update = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const block = blockRef.current;
    const first = Math.max(0, Math.floor(viewport.scrollTop / block) - OVERSCAN);
    const last = Math.min(rows.length - 1, Math.ceil((viewport.scrollTop + viewport.clientHeight) / block) + OVERSCAN);
    setRange((range) => (range.first === first && range.last === last ? range : { first, last }));
  }, [rows.length]);

  // Rows are exactly one block, so the first mounted row's height is the extent of every row at this size.
  useLayoutEffect(() => {
    if (!windowed) {
      return;
    }
    // An animating row is mid-way between zero and one block.
    const settled = viewportRef.current?.querySelectorAll<HTMLElement>('[data-tree-row]:not([data-disclosure])');
    const height = settled?.[0]?.getBoundingClientRect().height;
    if (height && height !== blockRef.current) {
      blockRef.current = height;
    }
    if (process.env.NODE_ENV !== 'production' && height && settled && !warnedRef.current) {
      const uneven = [...settled].find((row) => Math.abs(row.getBoundingClientRect().height - height) > 0.5);
      if (uneven) {
        warnedRef.current = true;
        log.warn("Tree virtual='fixed' needs rows of one height", { row: uneven.dataset.objectId });
      }
    }
    update();
  }, [windowed, update]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!windowed || !viewport) {
      return;
    }
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    viewport.addEventListener('scroll', update, { passive: true });
    scrollToIndexRef.current = (index) => {
      const block = blockRef.current;
      const top = index * block;
      if (top < viewport.scrollTop) {
        viewport.scrollTop = top;
      } else if (top + block > viewport.scrollTop + viewport.clientHeight) {
        viewport.scrollTop = top + block - viewport.clientHeight;
      }
      // zag focuses the row a frame after asking for it; when the window has not committed by then the row claims
      // focus itself as it mounts (below).
      pendingFocusRef.current = rows[index]?.value ?? null;
      update();
    };
    return () => {
      observer.disconnect();
      viewport.removeEventListener('scroll', update);
      scrollToIndexRef.current = null;
    };
  }, [windowed, update, scrollToIndexRef, rows]);

  // No dependency array: whichever commit mounts the pending row is the one that must focus it.
  useLayoutEffect(() => {
    const value = pendingFocusRef.current;
    const row = value && viewportRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`);
    if (row) {
      pendingFocusRef.current = null;
      row.focus();
    }
  });

  const first = windowed ? Math.min(range.first, Math.max(0, rows.length - 1)) : 0;
  const last = windowed ? Math.min(range.last, rows.length - 1) : rows.length - 1;
  const block = blockRef.current;

  return (
    <Next.ScrollArea.Root>
      <Next.ScrollArea.Viewport asChild>
        <TreeContentElement ref={viewportRef}>
          {windowed && first > 0 && <div role='none' style={{ height: first * block }} />}
          {rows.slice(first, last + 1).map((node) => (
            <Fragment key={node.value}>{renderRow(node)}</Fragment>
          ))}
          {windowed && last < rows.length - 1 && (
            <div role='none' style={{ height: (rows.length - 1 - last) * block }} />
          )}
          {trailing}
        </TreeContentElement>
      </Next.ScrollArea.Viewport>
    </Next.ScrollArea.Root>
  );
};

TreeContent.displayName = 'Tree.Content';

//
// Item
//

type TreeItemProps = {
  node: TreeNode;
  /** Replaces the default row (`ItemIndicator`, `ItemIcon`, `ItemText`); compose from those parts and trailing controls. */
  children?: ReactNode;
};

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
const TreeItem = ({ node, children }: TreeItemProps) => {
  const {
    treeId,
    virtual,
    draggable,
    dragPreview,
    renderDragPreview,
    indentGuides,
    canDrop,
    getDropKind,
    setOpen,
    disclosures,
  } = useTreeContext('Tree.Item');
  const { t } = useTranslation();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState>({ instruction: null, kind: 'move', dragging: false });
  const { id, path, item, depth, branch, open, props } = node;
  const canDrag = props.draggable !== false;
  const canBeTarget = props.droppable !== false;
  const label = toLocalizedString(props.label, t);

  useEffect(() => {
    const element = rowRef.current;
    if (!draggable || !element) {
      return;
    }
    const data: TreeData = { treeId, id, path, item };
    const mode: ItemMode = branch && open ? 'expanded' : 'standard';
    let expandTimer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      clearTimeout(expandTimer);
      expandTimer = undefined;
      setDrag((state) => ({ ...state, instruction: null }));
    };
    // pragmatic-dnd never sets `effectAllowed`, so over the source row the browser falls back to its copy cursor.
    const handleNativeDragStart = (event: DragEvent) => {
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
      }
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
    element.addEventListener('dragstart', handleNativeDragStart);
    return combine(
      () => element.removeEventListener('dragstart', handleNativeDragStart),
      makeDraggable({
        element,
        canDrag: () => canDrag,
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
      dropTargetForElements({
        element,
        getData: ({ input, element }) =>
          attachInstruction(data, {
            input,
            element,
            indentPerLevel: element.getBoundingClientRect().height,
            currentLevel: depth,
            mode,
            block: branch ? [] : ['make-child'],
          }),
        canDrop: ({ source }) =>
          canBeTarget &&
          source.element !== element &&
          isTreeDataFor(source.data, treeId) &&
          (canDrop?.({ source: source.data, target: data }) ?? true),
        getIsSticky: () => true,
        // Enter as well as drag: the first `onDrag` waits for a frame, so a quick pass would show no target.
        onDragEnter: updateTarget,
        onDrag: updateTarget,
        onDragLeave: clear,
        onDrop: clear,
      }),
      () => clearTimeout(expandTimer),
    );
  }, [
    draggable,
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
    label,
    canDrag,
    canBeTarget,
    canDrop,
    getDropKind,
    setOpen,
  ]);

  // A conceal outranks an enter: a row under a closing branch leaves with it.
  const under = disclosures.filter((disclosure) => isDescendant(path, disclosure.path));
  const phase = under.some(({ open }) => !open) ? 'conceal' : under.length > 0 ? 'enter' : undefined;
  const concealing = disclosures.some((disclosure) => !disclosure.open && disclosure.value === node.value);
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
    'data-dragging': drag.dragging ? '' : undefined,
    'data-drop-target': drop.target,
    'data-drop-kind': drop.target ? drag.kind : undefined,
    'data-disclosure': phase,
    'data-concealing': concealing ? '' : undefined,
    'data-testid': props.testId,
    style,
    'className': 'nx-grid nx-tree-item',
  };

  const content = (
    <>
      {children ?? (
        <>
          <TreeItemIndicator />
          <TreeItemIcon />
          <TreeItemText />
        </>
      )}
      {indentGuides &&
        Array.from({ length: depth - 1 }, (_, level) => (
          <span key={level} aria-hidden='true' className='nx-tree-indent-guide' style={guideStyle(level)} />
        ))}
      {(drop.target === 'top' || drop.target === 'bottom') && <Next.DropIndicator edge={drop.target} />}
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

TreeItem.displayName = 'Tree.Item';

/** Each indent guide's column, as a typed custom property rather than a cast of `style`. */
const guideStyle = (level: number): CSSProperties & Record<'--nx-tree-guide-level', string> => ({
  '--nx-tree-guide-level': String(level),
});

//
// ItemIndicator
//

type TreeItemIndicatorProps = {
  /** The caret glyph; it turns a quarter while the branch is open. */
  icon?: string;
};

/**
 * The disclosure cell: one block, holding the caret-only branch trigger on a branch and nothing on a leaf, so labels
 * align at every level. Only the caret toggles; a click elsewhere on the row selects it.
 */
const TreeItemIndicator = ({ icon = 'ph--caret-right--regular' }: TreeItemIndicatorProps) => {
  const { node } = useTreeItemContext('Tree.ItemIndicator');
  return (
    <Next.Block>
      {node.branch && (
        <TreeView.BranchTrigger className='nx-tree-branch-trigger'>
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

type TreeItemIconProps = Partial<ComponentPropsWithoutRef<typeof Next.Icon>>;

const ICON_HUES: readonly string[] = ['neutral', 'success', 'info', 'warning', 'error', ...hues];

/** Narrows the model's free-form `iconHue` to a hue the Icon can draw. */
const isIconHue = (value: string | undefined): value is Next.IconHue => !!value && ICON_HUES.includes(value);

/**
 * The icon cell: one block holding the row's icon (`itemProps.icon`, hued by `itemProps.iconHue`). Forwards Icon's
 * props, so `icon` and `hue` override the model's; the cell stays empty without an icon, keeping labels aligned.
 */
const TreeItemIcon = ({ icon, hue, ...props }: TreeItemIconProps) => {
  const { node } = useTreeItemContext('Tree.ItemIcon');
  const glyph = icon ?? node.props.icon;
  const iconHue = node.props.iconHue;
  return (
    <Next.Block classNames='nx-tree-item-icon'>
      {glyph && <Next.Icon {...props} icon={glyph} hue={hue ?? (isIconHue(iconHue) ? iconHue : undefined)} />}
    </Next.Block>
  );
};

TreeItemIcon.displayName = 'Tree.ItemIcon';

//
// ItemText
//

type TreeItemTextProps = {
  /** Replaces the model's label. */
  children?: ReactNode;
};

/** The row's label (`itemProps.label`, translated), truncated to one line. */
const TreeItemText = ({ children }: TreeItemTextProps) => {
  const { node } = useTreeItemContext('Tree.ItemText');
  const { t } = useTranslation();
  return (
    <Next.Typography truncate classNames='nx-tree-item-text'>
      {children ?? toLocalizedString(node.props.label, t)}
    </Next.Typography>
  );
};

TreeItemText.displayName = 'Tree.ItemText';

//
// Empty
//

type TreeEmptyProps = {
  icon?: string;
  children: ReactNode;
};

/**
 * Shown in place of rows when the root has no children; renders nothing otherwise. Moves onto `Next.Empty` (AUDIT
 * group A point 41) when that lands.
 */
const TreeEmpty = ({ icon, children }: TreeEmptyProps) => {
  const { walk } = useTreeContext('Tree.Empty');
  if (walk.rows.length > 0) {
    return null;
  }
  return (
    <div role='status' data-scope='tree-view' data-part='empty' className='nx-tree-empty'>
      {icon && <Next.Icon icon={icon} />}
      <Next.Typography>{children}</Next.Typography>
    </div>
  );
};

TreeEmpty.displayName = 'Tree.Empty';

//
// Namespace
//

/**
 * Hierarchical list on Ark's tree-view, driven by `TreeModel` atoms, with Ark's part names on the Next row vocabulary:
 * `Root` (model, `virtual`, `animate`, drag and drop), `Label`, `Content` (the scrolling tree element; a row renderer as
 * children), `Item` (one row), `ItemIndicator` (caret), `ItemIcon`, `ItemText` and `Empty`.
 */
export const Tree = {
  Root: TreeRoot,
  Label: TreeLabel,
  Content: TreeContent,
  Item: TreeItem,
  ItemIndicator: TreeItemIndicator,
  ItemIcon: TreeItemIcon,
  ItemText: TreeItemText,
  Empty: TreeEmpty,
};

export type {
  TreeContentProps,
  TreeEmptyProps,
  TreeItemIconProps,
  TreeItemIndicatorProps,
  TreeItemProps,
  TreeItemTextProps,
  TreeLabelProps,
  TreeRootProps,
};
