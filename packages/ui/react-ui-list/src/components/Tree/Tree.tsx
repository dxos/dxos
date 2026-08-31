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
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, {
  type FC,
  type MouseEvent,
  type PointerEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Icon, type Label, Tag, TextTooltip, toLocalizedString, useTranslation } from '@dxos/react-ui';
import {
  getStyles,
  hoverableControls,
  hoverableFocusedKeyboardControls,
  hoverableFocusedWithinControls,
  mx,
} from '@dxos/ui-theme';

import { Path } from '../../util';
import { DEFAULT_INDENTATION, paddingIndentation } from './helpers';
import { type TreeData } from './tree-data';
import {
  type ColumnRenderer,
  type TreeItemDataProps,
  type TreeModel,
  type TreeNodeEntry,
  type TreeRenderContextValue,
  TreeRenderProvider,
  useTreeRender,
} from './TreeContext';
import { TreeDropIndicator } from './TreeDropIndicator';
import { TreeItemToggle } from './TreeItemToggle';

const hoverableDescriptionIcons =
  '[--icons-color:inherit] hover-hover:[--icons-color:var(--description-text)] hover-hover:hover:[--icons-color:inherit] focus-within:[--icons-color:inherit]';

/** How long recorded pointer modifiers stay valid for the machine's selection callback. */
const MODIFIER_WINDOW = 500;

type TreeWalkState<T extends { id: string }> = {
  root: TreeNodeEntry<T>;
  expanded: string[];
  selected: string[];
  byValue: Map<string, TreeNodeEntry<T>>;
};

/** Splices group wrappers out so the machine sees their children as direct children of the group's parent. */
const spliceGroups = <T extends { id: string }>(entries: TreeNodeEntry<T>[] = []): TreeNodeEntry<T>[] =>
  entries.flatMap((entry) => (entry.group ? spliceGroups(entry.children) : [entry]));

/** Assigns collection index paths over the spliced topology. */
const assignIndexPaths = <T extends { id: string }>(entries: TreeNodeEntry<T>[] | undefined, base: number[]): void => {
  spliceGroups(entries ?? []).forEach((entry, index) => {
    entry.indexPath = [...base, index];
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
    };
    assignIndexPaths(root.children, []);
    return { root, expanded, selected, byValue };
  });

export type TreeProps<T extends { id: string } = any> = {
  model: TreeModel<T>;
  rootId?: string;
  path?: string[];
  id: string;
  classNames?: string | (string | undefined)[];
  gridTemplateColumns?: string;
  draggable?: boolean;
  selectionMode?: 'single' | 'multiple';
  renderColumns?: ColumnRenderer<T>;
  blockInstruction?: (params: { instruction: Instruction; source: TreeData; target: TreeData }) => boolean;
  canDrop?: (params: { source: TreeData; target: TreeData }) => boolean;
  canSelect?: (params: { item: T; path: string[] }) => boolean;
  onOpenChange?: (params: { item: T; path: string[]; open: boolean }) => void;
  onSelect?: (params: { item: T; path: string[]; current: boolean; option: boolean; shift: boolean }) => void;
  onItemHover?: (params: { item: T }) => void;
};

export const Tree = <T extends { id: string } = any>({
  model,
  rootId,
  path,
  id,
  classNames,
  gridTemplateColumns = '[tree-row-start] minmax(0, 1fr) min-content [tree-row-end]',
  draggable = false,
  selectionMode = 'single',
  renderColumns,
  blockInstruction,
  canDrop,
  canSelect,
  onOpenChange,
  onSelect,
  onItemHover,
}: TreeProps<T>) => {
  const treePath = useMemo(() => (path ? [...path, id] : [id]), [id, path]);
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
  const modifiersRef = useRef({ option: false, shift: false, at: 0 });
  const handlePointerDownCapture = useCallback((event: PointerEvent) => {
    modifiersRef.current = { option: event.altKey, shift: event.shiftKey, at: Date.now() };
  }, []);
  const recentModifiers = useCallback(() => {
    const { option, shift, at } = modifiersRef.current;
    return Date.now() - at < MODIFIER_WINDOW ? { option, shift } : { option: false, shift: false };
  }, []);

  const selectNode = useCallback(
    (node: TreeNodeEntry<T>, modifiers: { option: boolean; shift: boolean }) => {
      // A branch that is already current, or an option-activation, toggles instead of selecting.
      if (node.branch && (modifiers.option || node.current)) {
        onOpenChange?.({ item: node.item, path: node.path, open: !node.open });
      } else if (canSelect?.({ item: node.item, path: node.path }) ?? true) {
        onSelect?.({ item: node.item, path: node.path, current: !node.current, ...modifiers });
      }
    },
    [canSelect, onOpenChange, onSelect],
  );

  // Values whose branch content is running its conceal animation; the model close commits when the
  // animation finishes (the machine hides content the instant the controlled value shrinks, so an
  // animated exit has to precede the commit).
  const [closingValues, setClosingValues] = useState<ReadonlySet<string>>(() => new Set());
  const commitClose = useCallback(
    (node: TreeNodeEntry) => {
      onOpenChange?.({ item: node.item, path: node.path, open: false });
      setClosingValues((previous) => {
        if (!previous.has(node.value)) {
          return previous;
        }
        const next = new Set(previous);
        next.delete(node.value);
        return next;
      });
    },
    [onOpenChange],
  );

  const handleExpandedChange = useCallback(
    ({ expandedValue }: { expandedValue: string[] }) => {
      const previous = new Set(expanded);
      const next = new Set(expandedValue);
      for (const value of expandedValue) {
        if (!previous.has(value)) {
          const entry = byValue.get(value);
          entry && onOpenChange?.({ item: entry.item, path: entry.path, open: true });
        }
      }
      const removed = expanded.filter((value) => !next.has(value) && byValue.has(value));
      if (removed.length > 0) {
        setClosingValues((current) => {
          const merged = new Set(current);
          removed.forEach((value) => merged.add(value));
          return merged;
        });
      }
    },
    [expanded, byValue, onOpenChange],
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
        selectNode(entry, recentModifiers());
      }
    },
    [selected, byValue, selectNode, recentModifiers],
  );

  // Flipped after the first commit: branch content inserted during the initial paint (persisted
  // open state) must not animate; only user-driven disclosure does.
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  const renderContext = useMemo<TreeRenderContextValue<T>>(
    () => ({
      draggable,
      renderColumns,
      blockInstruction,
      canDrop,
      onOpenChange,
      onItemHover,
      selectNode,
      mountedRef,
      closingValues,
      commitClose,
    }),
    [
      draggable,
      renderColumns,
      blockInstruction,
      canDrop,
      onOpenChange,
      onItemHover,
      selectNode,
      closingValues,
      commitClose,
    ],
  );

  return (
    <TreeView.Root
      collection={collection}
      expandedValue={expanded}
      selectedValue={selected}
      selectionMode={selectionMode}
      expandOnClick={false}
      lazyMount
      onExpandedChange={handleExpandedChange}
      onSelectionChange={handleSelectionChange}
      className='contents'
    >
      <TreeRenderProvider value={renderContext as TreeRenderContextValue}>
        <TreeView.Tree
          // `outline-none`: the machine parks focus on the tree container (tabIndex=-1) when no
          // row holds it, which must not draw a focus ring around the whole tree.
          className={mx('grid outline-none', ...(Array.isArray(classNames) ? classNames : [classNames]))}
          style={{ gridTemplateColumns }}
          onPointerDownCapture={handlePointerDownCapture}
        >
          {root.children?.map((node) => (
            <TreeNodeRow key={node.value} node={node} />
          ))}
        </TreeView.Tree>
      </TreeRenderProvider>
    </TreeView.Root>
  );
};

/** Renders a section-group label spanning the full tree row. Used when a node has `disposition === 'group'`. */
const TreeSectionHeader = ({ label }: { label: Label }) => {
  const { t } = useTranslation();
  return (
    // `presentation`: a heading is not a permitted child of `role=tree`, and the label is
    // decorative — the group's items remain individually labeled.
    <div
      role='presentation'
      className='col-[tree-row] pl-7 pt-3 pb-0.5 text-xs uppercase tracking-widest text-subdued hover:text-description select-none'
    >
      {toLocalizedString(label, t)}
    </div>
  );
};

type TreeNodeRowProps = { node: TreeNodeEntry };

const TreeNodeRow: FC<TreeNodeRowProps> = memo(({ node }) => {
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
        <TreeView.Branch className='contents'>
          <TreeNodeRowContent node={node} />
          <TreeBranchContent node={node} />
        </TreeView.Branch>
      ) : (
        <TreeNodeRowContent node={node} />
      )}
    </TreeView.NodeProvider>
  );
});

TreeNodeRow.displayName = 'Tree.NodeRow';

/** How long past the conceal animation before the close force-commits (animation may never run). */
const CONCEAL_COMMIT_TIMEOUT = 300;

/**
 * Branch children container. Disclosure animates height (via `interpolate-size`, opacity-only
 * where unsupported) — but only for content inserted after the initial paint, so a tree restoring
 * persisted open state does not animate every branch on load. The gate is stamped at DOM insertion
 * time because lazy-mounted content attaches long after the row first renders. A collapse first
 * runs the conceal animation and only then commits the model close (which is when the machine
 * actually hides the content).
 */
const TreeBranchContent: FC<TreeNodeRowProps> = ({ node }) => {
  const { mountedRef, closingValues, commitClose } = useTreeRender();
  const elementRef = useRef<HTMLDivElement | null>(null);
  const closing = closingValues.has(node.value);

  const handleRef = useCallback(
    (element: HTMLDivElement | null) => {
      elementRef.current = element;
      if (element && mountedRef.current) {
        element.dataset.animate = '';
      }
    },
    [mountedRef],
  );

  useEffect(() => {
    if (!closing) {
      return;
    }
    const element = elementRef.current;
    if (!element || element.hidden) {
      commitClose(node);
      return;
    }
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        commitClose(node);
      }
    };
    const handleAnimationEnd = (event: AnimationEvent) => {
      if (String(event.animationName).includes('tree-conceal')) {
        finish();
      }
    };
    element.addEventListener('animationend', handleAnimationEnd);
    const timer = setTimeout(finish, CONCEAL_COMMIT_TIMEOUT);
    return () => {
      element.removeEventListener('animationend', handleAnimationEnd);
      clearTimeout(timer);
      // Unmounting mid-conceal (the ref is already detached) would otherwise strand the model
      // open and the value in `closingValues`; a dep-change re-run keeps the element and re-arms.
      if (!elementRef.current) {
        finish();
      }
    };
  }, [closing, node, commitClose]);

  return (
    <TreeView.BranchContent
      ref={handleRef}
      // `[&[hidden]]:hidden` restores the UA collapse that the `grid` display would defeat.
      className={mx(
        'col-[tree-row] grid grid-cols-subgrid [&[hidden]]:hidden',
        'overflow-y-clip [interpolate-size:allow-keywords]',
        closing ? 'animate-tree-conceal' : 'data-[animate]:data-[state=open]:animate-tree-disclose',
      )}
    >
      {node.children?.map((child) => (
        <TreeNodeRow key={child.value} node={child} />
      ))}
    </TreeView.BranchContent>
  );
};

TreeBranchContent.displayName = 'Tree.BranchContent';

type TreeItemDragState = 'idle' | 'dragging' | 'preview' | 'parent-of-instruction';

/** The visible row: branch control or leaf item, with DnD wiring, columns, and the drop indicator. */
const TreeNodeRowContent: FC<TreeNodeRowProps> = memo(({ node }) => {
  const {
    draggable: treeDraggable,
    renderColumns: Columns,
    blockInstruction,
    canDrop,
    onOpenChange,
    onItemHover,
    selectNode,
  } = useTreeRender();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(false);
  const cancelExpandRef = useRef<NodeJS.Timeout | null>(null);
  const [, setDragState] = useState<TreeItemDragState>('idle');
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { id, item, path, level, branch, open, last, current, props } = node;
  const mode: ItemMode = last ? 'last-in-group' : open ? 'expanded' : 'standard';
  const data = { id, path, item } satisfies TreeData;
  const isItemDraggable = treeDraggable && props.draggable !== false;
  const isItemDroppable = props.droppable !== false;
  const shouldSeedNativeDragData = typeof document !== 'undefined' && document.body.hasAttribute('data-platform');

  const cancelExpand = useCallback(() => {
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
        onDragStart: () => {
          setDragState('dragging');
          if (open) {
            openRef.current = true;
            onOpenChange?.({ item, path, open: false });
          }
        },
        onDrop: () => {
          setDragState('idle');
          if (openRef.current) {
            onOpenChange?.({ item, path, open: true });
          }
        },
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
          indentPerLevel: DEFAULT_INDENTATION,
          currentLevel: level,
          mode,
          block: branch ? [] : ['make-child'],
        }),
      canDrop: ({ source }) => {
        const permitted = canDrop ?? (() => true);
        return source.element !== element && permitted({ source: source.data as TreeData, target: data });
      },
      getIsSticky: () => true,
      onDrag: ({ self, source }) => {
        const desired = extractInstruction(self.data);
        const block =
          desired && blockInstruction?.({ instruction: desired, source: source.data as TreeData, target: data });
        const next: Instruction | null =
          block && desired.type !== 'instruction-blocked' ? { type: 'instruction-blocked', desired } : desired;

        if (source.data.id !== id) {
          if (next?.type === 'make-child' && branch && !open && !cancelExpandRef.current) {
            cancelExpandRef.current = setTimeout(() => {
              onOpenChange?.({ item, path, open: true });
            }, 500);
          }
          if (next?.type !== 'make-child') {
            cancelExpand();
          }
          setInstruction(next);
        } else if (next?.type === 'reparent') {
          setInstruction(next);
        } else {
          setInstruction(null);
        }
      },
      onDragLeave: () => {
        cancelExpand();
        setInstruction(null);
      },
      onDrop: () => {
        cancelExpand();
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
    mode,
    level,
    branch,
    open,
    blockInstruction,
    canDrop,
    onOpenChange,
    cancelExpand,
    shouldSeedNativeDragData,
  ]);

  useEffect(() => () => cancelExpand(), [cancelExpand]);

  // The machine skips selection events for an already-selected row, so re-activation (toggle a
  // current branch, scroll a current leaf into view) is handled here.
  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (current) {
        event.preventDefault();
        selectNode(node, { option: event.altKey, shift: event.shiftKey });
      }
    },
    [current, node, selectNode],
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
      data-testid={props.testId}
      className={mx(
        'grid grid-cols-subgrid col-[tree-row] mt-0.5 outline-none cursor-pointer select-none',
        // Selection keys off zag's `data-selected`: for branches, `aria-selected` lands on the
        // Branch wrapper (display:contents) while the visible row is the control. No focus-within
        // background — after a chevron click focus rests inside the row, and a persistent fill
        // there reads as selection.
        'hover:bg-hover-surface',
        'data-[selected]:bg-current-surface data-[selected]:text-current-fg',
        'dx-focus-ring-inset',
        // Highlight the row while a descendant marks an open popover anchor (e.g. inline rename).
        'has-[[data-popover-anchor]]:bg-current-surface',
        hoverableControls,
        hoverableFocusedKeyboardControls,
        hoverableFocusedWithinControls,
        hoverableDescriptionIcons,
        props.className,
      )}
      onClick={handleClick}
      onMouseEnter={handleItemHover}
      onContextMenu={handleContextMenu}
    >
      <div className='indent relative grid grid-cols-subgrid col-[tree-row]' style={paddingIndentation(level)}>
        <div role='none' className='flex items-center'>
          {branch ? (
            <TreeView.BranchTrigger asChild>
              {/* zag stamps data-state=open on the trigger, which the ghost button styles as an
                  open menu trigger (bg-input-bg) — the chevron must stay transparent. */}
              <TreeItemToggle isBranch open={open} classNames='data-[state=open]:bg-transparent' />
            </TreeView.BranchTrigger>
          ) : (
            <TreeItemToggle isBranch={false} />
          )}
          <TreeNodeHeading props={props} />
        </div>
        {Columns && <Columns item={item} path={path} open={open} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />}
        {instruction && <TreeDropIndicator instruction={instruction} gap={2} />}
      </div>
    </Comp>
  );
});

TreeNodeRowContent.displayName = 'Tree.NodeRowContent';

/** Icon + truncating label + count badge. The row itself is the interactive element. */
const TreeNodeHeading = ({ props }: { props: TreeItemDataProps }) => {
  const { t } = useTranslation();
  const styles = props.iconHue ? getStyles(props.iconHue) : undefined;
  const text = toLocalizedString(props.label, t);
  return (
    <TextTooltip text={text} side='bottom' truncateQuery='span[data-tooltip]' onlyWhenTruncating asChild>
      <div
        data-testid='treeItem.heading'
        className={mx(
          'grow shrink flex items-center min-w-0 gap-2 ps-0.5 min-h-(--dx-control) cursor-pointer select-none',
          props.disabled && 'cursor-default',
          props.headingClassName,
        )}
      >
        {props.icon && <Icon size={5} icon={props.icon} classNames={['my-1', styles?.text]} />}
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
