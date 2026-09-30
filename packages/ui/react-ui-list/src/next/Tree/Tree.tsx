//
// Copyright 2026 DXOS.org
//

// Spike (DESIGN.md Phase 4 decision 4): the next Tree on Ark's tree-view, fed by the existing `TreeModel`. zag owns
// focus, the APG keymap, typeahead, expansion and selection state; this file owns the lazy walk (tree-collection.ts),
// windowing, Next row layout and pragmatic-drag-and-drop.

import { TreeView } from '@ark-ui/react/tree-view';
import {
  type Instruction,
  type ItemMode,
  attachInstruction,
  extractInstruction,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  draggable as makeDraggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useAtomValue } from '@effect/atom-react/Hooks';
import React, {
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefObject,
  Fragment,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

import { raise } from '@dxos/debug';
import { composable, composableProps, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Next, type Size } from '@dxos/react-ui/next';

import { type TreeData, isTreeDataFor } from '../../components/Tree/tree-data.ts';
import { type TreeModel } from '../../components/Tree/TreeContext.ts';
import { type DropKind } from '../../components/Tree/TreeDropIndicator.tsx';
import { type TreeNode, type TreeWalk, createCollection, createTreeWalkAtom } from './tree-collection.ts';

/** `window` mounts only the rows in view; `css` mounts every row with `content-visibility: auto`. */
export type TreeVirtualize = 'none' | 'css' | 'window';

export type TreeDropEvent<T extends { id: string } = any> = {
  instruction: Instruction;
  source: TreeData;
  target: TreeData;
  item: T;
};

type TreeContextValue = {
  treeId: string;
  walk: TreeWalk;
  virtualize: TreeVirtualize;
  draggable: boolean;
  indentGuides: boolean;
  canDrop?: (params: { source: TreeData; target: TreeData }) => boolean;
  getDropKind?: (params: { instruction: Instruction; source: TreeData; target: TreeData }) => DropKind;
  onOpenChange?: (params: { item: any; path: string[]; open: boolean }) => void;
  /** Set by Content when windowed; zag calls it before focusing a row it may not have mounted. */
  scrollToIndexRef: RefObject<((index: number) => void) | null>;
};

// Behaviour only (drop policy, walk), never size or level (Next decision 3).
const TreeContext = createContext<TreeContextValue | null>(null);

const useTreeContext = (consumer: string) => useContext(TreeContext) ?? raise(new Error(`${consumer} outside Tree.Root`));

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
  selectionMode?: 'single' | 'multiple';
  virtualize?: TreeVirtualize;
  draggable?: boolean;
  indentGuides?: boolean;
  canDrop?: TreeContextValue['canDrop'];
  getDropKind?: TreeContextValue['getDropKind'];
  onOpenChange?: (params: { item: T; path: string[]; open: boolean }) => void;
  onSelect?: (params: { item: T; path: string[]; current: boolean }) => void;
  onDrop?: (event: TreeDropEvent<T>) => void;
  children?: ReactNode;
};

/**
 * Ark `TreeView.Root`, fully controlled from the model: `expandedValue`/`selectedValue` come from the walk, and the
 * machine's changes are reported through `onOpenChange`/`onSelect` for the model to apply.
 */
const TreeRoot = <T extends { id: string }>({
  model,
  rootId,
  id,
  size,
  selectionMode = 'single',
  virtualize = 'none',
  draggable = false,
  indentGuides = false,
  canDrop,
  getDropKind,
  onOpenChange,
  onSelect,
  onDrop,
  children,
}: TreeRootProps<T>) => {
  const walkAtom = useMemo(() => createTreeWalkAtom(model, rootId, [id]), [model, rootId, id]);
  const walk = useAtomValue(walkAtom);
  const collection = useMemo(() => createCollection(walk.root), [walk.root]);
  const scrollToIndexRef = useRef<((index: number) => void) | null>(null);

  const handleExpandedChange = useCallback(
    ({ expandedValue }: { expandedValue: string[] }) => {
      const next = new Set(expandedValue);
      const previous = new Set(walk.expanded);
      for (const value of expandedValue) {
        const node = previous.has(value) ? undefined : walk.byValue.get(value);
        node && onOpenChange?.({ item: node.item, path: node.path, open: true });
      }
      for (const value of walk.expanded) {
        const node = next.has(value) ? undefined : walk.byValue.get(value);
        node && onOpenChange?.({ item: node.item, path: node.path, open: false });
      }
    },
    [walk, onOpenChange],
  );

  const handleSelectionChange = useCallback(
    ({ selectedValue }: { selectedValue: string[] }) => {
      const next = new Set(selectedValue);
      const previous = new Set(walk.selected);
      for (const value of selectedValue) {
        const node = previous.has(value) ? undefined : walk.byValue.get(value);
        node && onSelect?.({ item: node.item, path: node.path, current: true });
      }
      for (const value of walk.selected) {
        const node = next.has(value) ? undefined : walk.byValue.get(value);
        node && onSelect?.({ item: node.item, path: node.path, current: false });
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
        const targetData = target.data as TreeData;
        onDropRef.current?.({ instruction, source: source.data as TreeData, target: targetData, item: targetData.item });
      },
    });
  }, [draggable, id]);

  const context = useMemo<TreeContextValue>(
    () => ({
      treeId: id,
      walk,
      virtualize,
      draggable,
      indentGuides,
      canDrop,
      getDropKind,
      onOpenChange,
      scrollToIndexRef,
    }),
    [id, walk, virtualize, draggable, indentGuides, canDrop, getDropKind, onOpenChange],
  );

  return (
    <TreeContext.Provider value={context}>
      <TreeView.Root
        collection={collection}
        expandedValue={walk.expanded}
        selectedValue={walk.selected}
        selectionMode={selectionMode}
        onExpandedChange={handleExpandedChange}
        onSelectionChange={handleSelectionChange}
        scrollToIndexFn={virtualize === 'window' ? ({ index }) => scrollToIndexRef.current?.(index) : undefined}
        data-size={size}
        className='nx-tree'
      >
        {children}
      </TreeView.Root>
    </TreeContext.Provider>
  );
};

TreeRoot.displayName = 'Tree.Root';

//
// Label
//

type TreeLabelProps = ComponentPropsWithoutRef<typeof TreeView.Label>;

/** The machine's own label part, which it already points `aria-labelledby` at. */
const TreeLabel = forwardRef<HTMLLabelElement, TreeLabelProps>((props, forwardedRef) => (
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
  /** Renders one row; the default is `<Tree.Item node={node} />`. */
  children?: (node: TreeNode) => ReactNode;
};

/**
 * The tree element as the viewport of a thin ScrollArea. Rows are rendered flat in visible (pre-order) order, never
 * nested in `BranchContent`: zag navigates the collection rather than the DOM, so the flat list serves both the whole
 * tree and a window of it, and `aria-level`/`aria-expanded` carry the hierarchy.
 */
const TreeContent = ({ children: renderRow = (node) => <TreeItem node={node} /> }: TreeContentProps) => {
  const { walk, virtualize, scrollToIndexRef } = useTreeContext('Tree.Content');
  const { rows } = walk;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const blockRef = useRef(NOMINAL_BLOCK);
  const windowed = virtualize === 'window';
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
    const row = viewportRef.current?.querySelector<HTMLElement>('[data-tree-row]');
    const height = row?.getBoundingClientRect().height;
    if (height && height !== blockRef.current) {
      blockRef.current = height;
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
      // Mounted before zag's next-frame `focus()`, which would otherwise find no element.
      flushSync(update);
    };
    return () => {
      observer.disconnect();
      viewport.removeEventListener('scroll', update);
      scrollToIndexRef.current = null;
    };
  }, [windowed, update, scrollToIndexRef]);

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
          {windowed && last < rows.length - 1 && <div role='none' style={{ height: (rows.length - 1 - last) * block }} />}
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
  /** Replaces the default heading (icon and label) after the disclosure cell; compose from Next parts. */
  children?: ReactNode;
};

type DragState = { instruction: Instruction | null; kind: DropKind; dragging: boolean };

/**
 * A row: Ark's `BranchControl` (inside a `display: contents` `Branch`, which carries the `treeitem` role) or `Item`,
 * laid out as a Container row on its own fixed template (disclosure block, icon block, label, trailing), indented by
 * one block per level. Rows are drag sources and drop targets when the Root is `draggable`.
 */
const TreeItem = ({ node, children }: TreeItemProps) => {
  const { treeId, virtualize, draggable, indentGuides, canDrop, getDropKind, onOpenChange } =
    useTreeContext('Tree.Item');
  const { t } = useTranslation();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState>({ instruction: null, kind: 'move', dragging: false });
  const { id, path, item, depth, branch, open, props } = node;

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
    return combine(
      makeDraggable({
        element,
        getInitialData: () => data,
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
          source.element !== element &&
          isTreeDataFor(source.data, treeId) &&
          (canDrop?.({ source: source.data, target: data }) ?? true),
        getIsSticky: () => true,
        onDrag: ({ self, source }) => {
          const desired = extractInstruction(self.data);
          const kind =
            desired && desired.type !== 'instruction-blocked'
              ? (getDropKind?.({ instruction: desired, source: source.data as TreeData, target: data }) ?? 'move')
              : 'move';
          const instruction: Instruction | null =
            kind === 'reject' && desired && desired.type !== 'instruction-blocked'
              ? { type: 'instruction-blocked', desired }
              : desired;
          // Holding over a closed branch's centre opens it, as the current Tree does.
          if (instruction?.type === 'make-child' && branch && !open && !expandTimer) {
            expandTimer = setTimeout(() => onOpenChange?.({ item, path, open: true }), 500);
          } else if (instruction?.type !== 'make-child') {
            clearTimeout(expandTimer);
            expandTimer = undefined;
          }
          setDrag((state) => ({ ...state, instruction, kind }));
        },
        onDragLeave: clear,
        onDrop: clear,
      }),
      () => clearTimeout(expandTimer),
    );
  }, [draggable, treeId, id, path, item, depth, branch, open, canDrop, getDropKind, onOpenChange]);

  const style: CSSProperties & Record<`--${string}`, string> = {
    '--nx-columns': 'var(--nx-block-size) var(--nx-block-size) minmax(0, 1fr) auto',
    '--nx-tree-depth': String(depth - 1),
  };
  const rowProps = {
    'data-tree-row': '',
    'data-object-id': id,
    'data-gutter': 'inherit',
    'data-layout': 'row',
    'data-columns': '',
    'data-virtualize': virtualize === 'css' ? 'css' : undefined,
    'data-dragging': drag.dragging ? '' : undefined,
    'data-drop': drag.instruction?.type === 'make-child' ? 'inside' : undefined,
    'data-testid': props.testId,
    style,
    className: 'nx-grid nx-tree-item',
  };

  const label = toLocalizedString(props.label, t);
  const content = (
    <>
      <Next.Block>
        {branch && (
          <TreeView.BranchTrigger className='nx-tree-branch-trigger'>
            <TreeView.BranchIndicator className='nx-tree-branch-indicator'>
              <Next.Icon icon='ph--caret-right--regular' />
            </TreeView.BranchIndicator>
          </TreeView.BranchTrigger>
        )}
      </Next.Block>
      {children ?? (
        <>
          <Next.Block>{props.icon && <Next.Icon icon={props.icon} />}</Next.Block>
          <Next.Typography truncate>{label}</Next.Typography>
        </>
      )}
      {indentGuides &&
        Array.from({ length: depth - 1 }, (_, level) => (
          <span
            key={level}
            aria-hidden='true'
            className='nx-tree-indent-guide'
            style={{ '--nx-tree-guide-level': String(level) } as CSSProperties}
          />
        ))}
      <TreeDropLine instruction={drag.instruction} />
    </>
  );

  return (
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
  );
};

TreeItem.displayName = 'Tree.Item';

/** Before/after lines use Next's DropIndicator; "inside" is drawn by the row itself (`data-drop='inside'`). */
const TreeDropLine = ({ instruction }: { instruction: Instruction | null }) => {
  switch (instruction?.type) {
    case 'reorder-above':
      return <Next.DropIndicator edge='top' />;
    case 'reorder-below':
    case 'reparent':
      return <Next.DropIndicator edge='bottom' />;
    default:
      return null;
  }
};

//
// Namespace
//

/** Private spike namespace; not exported from `@dxos/react-ui-list/next`. */
export const Tree = {
  Root: TreeRoot,
  Label: TreeLabel,
  Content: TreeContent,
  Item: TreeItem,
};

export type { TreeContentProps, TreeItemProps, TreeLabelProps, TreeRootProps };
