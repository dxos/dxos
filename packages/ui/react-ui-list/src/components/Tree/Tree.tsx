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

import { Path } from '../../util/index.ts';
import { DROP_INDENTATION, paddingIndentation } from './helpers.ts';
import { type TreeData } from './tree-data.ts';
import {
  type ColumnRenderer,
  type HeadingRenderer,
  type IconRenderer,
  type TreeItemDataProps,
  type TreeModel,
  type TreeNodeEntry,
  type TreeRenderContextValue,
  TreeRenderProvider,
  useTreeRender,
} from './TreeContext.ts';
import { TreeDropDebug } from './TreeDropDebug.tsx';
import { TreeDropIndicator } from './TreeDropIndicator.tsx';
import { TreeItemToggle } from './TreeItemToggle.tsx';

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
  /**
   * Accessible name for the tree. Ark names it "Tree View" by default, which says what the widget
   * is and not which list it is — a page with more than one is then unnavigable by name. Rendered
   * into the machine's own `Label` part, so the tree carries one name rather than an `aria-label`
   * competing with the `aria-labelledby` Ark points at that part regardless.
   */
  ariaLabel?: string;
  classNames?: string | (string | undefined)[];
  gridTemplateColumns?: string;
  draggable?: boolean;
  selectionMode?: 'single' | 'multiple';
  renderColumns?: ColumnRenderer<T>;
  renderIcon?: IconRenderer<T>;
  renderHeading?: HeadingRenderer<T>;
  blockInstruction?: (params: { instruction: Instruction; source: TreeData; target: TreeData }) => boolean;
  canDrop?: (params: { source: TreeData; target: TreeData }) => boolean;
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
  canSelect?: (params: { item: T; path: string[] }) => boolean;
  onOpenChange?: (params: { item: T; path: string[]; open: boolean }) => void;
  onSelect?: (params: { item: T; path: string[]; current: boolean; option: boolean; shift: boolean }) => void;
  onItemHover?: (params: { item: T }) => void;
  /**
   * Keydown on the tree container. The escape hatch for gestures the machine does not own — zag
   * ignores modified arrows, so a consumer can bind e.g. `Alt+Arrow` restructuring here rather
   * than wrapping the tree in an element that would only exist to carry the handler.
   */
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
};

export const Tree = <T extends { id: string } = any>({
  model,
  rootId,
  path,
  id,
  ariaLabel,
  classNames,
  gridTemplateColumns = '[tree-row-start] minmax(0, 1fr) min-content [tree-row-end]',
  draggable = false,
  selectionMode = 'single',
  renderColumns,
  renderIcon,
  renderHeading,
  blockInstruction,
  canDrop,
  leavesAcceptChildren = false,
  selectionFollowsFocus = false,
  debug = false,
  dropBelowExpanded = false,
  dropAtEnd = false,
  canSelect,
  onOpenChange,
  onSelect,
  onItemHover,
  onKeyDown,
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

  // Values whose branch content is running its conceal animation; the model close commits when the
  // animation finishes (the machine hides content the instant the controlled value shrinks,
  // so an animated exit has to precede the commit).
  const [closingValues, setClosingValues] = useState<ReadonlySet<string>>(() => new Set());

  /** Starts a branch's conceal animation; the model close commits when it ends. */
  const requestClose = useCallback((value: string) => {
    setClosingValues((previous) => (previous.has(value) ? previous : new Set(previous).add(value)));
  }, []);

  /**
   * Flips a branch's disclosure, from the row, the chevron or the keyboard alike.
   *
   * Closing goes through the same deferral the chevron uses: committing it here hid the content
   * before it could animate, so the same gesture read as instant from the row and animated from the
   * chevron.
   */
  const toggleOpen = useCallback(
    (node: TreeNodeEntry<T>) => {
      if (node.open) {
        requestClose(node.value);
      } else {
        onOpenChange?.({ item: node.item, path: node.path, open: true });
      }
    },
    [onOpenChange, requestClose],
  );

  const onSelectNode = useCallback(
    (node: TreeNodeEntry<T>, modifiers: { option: boolean; shift: boolean }) => {
      // A branch that is already current, or an option-activation, toggles instead of selecting.
      if (node.branch && (modifiers.option || node.current)) {
        // Closing goes through the same deferral the chevron uses. Calling `onOpenChange` here
        // committed the close at once, so the machine hid the content before it could animate —
        // the same gesture read as instant from the row and animated from the chevron.
        toggleOpen(node);
      } else if (canSelect?.({ item: node.item, path: node.path }) ?? true) {
        onSelect?.({ item: node.item, path: node.path, current: !node.current, ...modifiers });
      }
    },
    [canSelect, onSelect, toggleOpen],
  );

  const onCommitClose = useCallback(
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

  /** Last row the machine reported focus on — the target `Enter`/`Space` act upon. */
  const focusedValueRef = useRef<string | null>(null);

  // Controlled, so focus can be directed (a drop returns it to the row that moved) rather than only
  // observed. Mirrors the machine's own changes back, which is what keeps it a roving tabstop.
  const [focusedValue, setFocusedValue] = useState<string | null>(null);

  /**
   * Node awaiting DOM focus, by id. Held in a ref so the effect below survives the re-renders the
   * drop causes, and keyed on the id rather than the value: a drop that reparents changes the row's
   * path, so the value captured when the drag started no longer matches anything.
   */
  const pendingFocusRef = useRef<string | null>(null);

  /**
   * Directs the roving tabstop at a row, and takes DOM focus with it.
   *
   * The controlled value alone is not enough: the machine moves focus in response to interaction,
   * and a drop is not one of its events — after one every row is left at `tabindex=-1`. The node is
   * looked up when the effect runs rather than captured here, because the reorder replaces or moves
   * the row's element, and focusing a node the commit is about to move only blurs it again.
   */
  const focusNode = useCallback((id: string, value: string) => {
    pendingFocusRef.current = id;
    setFocusedValue(value);
  }, []);

  // No dependency array: the render that lands the reorder is the one to follow, and which render
  // that is depends on how the consumer commits the move.
  useEffect(() => {
    const id = pendingFocusRef.current;
    if (!id) {
      return;
    }
    // Queried off the document, not a ref to the tree: `TreeView.Tree` is Ark's element and may not
    // forward one.
    const row = document.querySelector<HTMLElement>(`[data-object-id="${CSS.escape(id)}"]`);
    if (!row) {
      return;
    }
    // Only while focus is still where the drag left it: the reader may have clicked away, and
    // taking it back then would be worse than losing the tabstop.
    const active = document.activeElement;
    if (!active || active === document.body || row.parentElement?.contains(active)) {
      pendingFocusRef.current = null;
      row.focus();
    }
  });

  // Focus moves without a selection event of its own, so the follow is driven from the machine's
  // focus change rather than inferred from the selection one.
  const handleFocusChange = useCallback(
    ({ focusedValue }: { focusedValue: string | null }) => {
      // Recorded whatever the follow setting is: the keyboard's own activation needs the focused
      // row, and the machine reports it nowhere else.
      focusedValueRef.current = focusedValue;
      setFocusedValue(focusedValue);
      if (!selectionFollowsFocus || !focusedValue || selected.includes(focusedValue)) {
        return;
      }
      const entry = byValue.get(focusedValue);
      if (entry) {
        onSelectNode(entry, { option: false, shift: false });
      }
    },
    [selectionFollowsFocus, selected, byValue, onSelectNode],
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
        onSelectNode(entry, recentModifiers());
      }
    },
    [selected, byValue, onSelectNode, recentModifiers],
  );

  /**
   * `Enter`/`Space` on the current branch toggles it.
   *
   * The machine emits a selection change only when the selected value actually changes, so
   * activating the row that is already selected reached nothing — the gesture that toggles by
   * pointer did nothing by keyboard. Gated on `current` so it mirrors the pointer exactly: the
   * first activation selects, the second discloses.
   */
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
      if (entry?.branch && entry.current) {
        event.preventDefault();
        toggleOpen(entry);
      }
    },
    [onKeyDown, byValue, toggleOpen],
  );

  // Flipped after the first commit: branch content inserted during the initial paint (persisted
  // open state) must not animate; only user-driven disclosure does.
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  const renderContext = useMemo<TreeRenderContextValue<T>>(
    () => ({
      treeId: id,
      focusNode,
      draggable,
      renderColumns,
      renderIcon,
      renderHeading,
      blockInstruction,
      canDrop,
      leavesAcceptChildren,
      debug,
      dropBelowExpanded,
      onOpenChange,
      onItemHover,
      selectNode: onSelectNode,
      closingValues,
      commitClose: onCommitClose,
      mountedRef,
    }),
    [
      id,
      focusNode,
      draggable,
      renderColumns,
      renderIcon,
      renderHeading,
      blockInstruction,
      canDrop,
      leavesAcceptChildren,
      debug,
      dropBelowExpanded,
      onSelectNode,
      closingValues,
      onOpenChange,
      onItemHover,
      onCommitClose,
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
      className='contents'
    >
      {/* The name the machine already points `aria-labelledby` at; `sr-only` because the tree is
          labelled for assistive technology, not captioned on screen. */}
      {ariaLabel && <TreeView.Label className='sr-only'>{ariaLabel}</TreeView.Label>}
      <TreeRenderProvider value={renderContext as TreeRenderContextValue}>
        <TreeView.Tree
          // `outline-none`: the machine parks focus on the tree container (tabIndex=-1) when no
          // row holds it, which must not draw a focus ring around the whole tree.
          className={mx('grid outline-none', ...(Array.isArray(classNames) ? classNames : [classNames]))}
          style={{ gridTemplateColumns }}
          onPointerDownCapture={handlePointerDownCapture}
          onKeyDown={handleKeyDown}
        >
          {root.children?.map((node) => (
            <TreeNodeRow key={node.value} node={node} />
          ))}
          {dropAtEnd && draggable && (
            <TreeEndDropTarget data={{ treeId: id, id: root.id, path: root.path, item: root.item }} />
          )}
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

  // The latest entry, read by the close callback without being the effect's identity: a model that
  // rebuilds on every tick (live data) produces new entry objects, and depending on the object would
  // clear and re-arm the commit timer indefinitely, stranding the branch in `closingValues`.
  const nodeRef = useRef(node);
  nodeRef.current = node;

  useEffect(() => {
    if (!closing) {
      return;
    }
    const element = elementRef.current;
    if (!element || element.hidden) {
      commitClose(nodeRef.current);
      return;
    }
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        commitClose(nodeRef.current);
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
  }, [closing, node.value, commitClose]);

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
    renderColumns: Columns,
    renderHeading: RenderHeading,
    blockInstruction,
    canDrop,
    leavesAcceptChildren,
    debug,
    dropBelowExpanded,
    onOpenChange,
    onItemHover,
    selectNode,
    focusNode,
  } = useTreeRender();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(false);
  const cancelExpandRef = useRef<NodeJS.Timeout | null>(null);
  const [dragState, setDragState] = useState<TreeItemDragState>('idle');
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { id, value, item, path, level, branch, open, last, current, props } = node;
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
        onDragStart: () => {
          setDragState('dragging');
          // Stamped every drag, not only when open: a row left over from an earlier open-branch
          // drag would otherwise still read `true` here and be reopened on drop.
          openRef.current = open;
          if (open) {
            onOpenChange?.({ item, path, open: false });
          }
        },
        onDrop: () => {
          setDragState('idle');
          if (openRef.current) {
            onOpenChange?.({ item, path, open: true });
          }
          // Return the roving tabstop to the row that moved, so the arrows carry on from where the
          // reader left it — a drag leaves focus on the body, which restarts navigation at the top
          // of the tree. Asking the machine rather than calling `focus()` here: the reorder moves
          // this row's DOM node, and moving a node blurs it, so any focus set around the drop races
          // the commit. As controlled state it is simply the focused value once the tree renders.
          focusNode(id, value);
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
          indentPerLevel: DROP_INDENTATION,
          currentLevel: level,
          mode,
          block: branch || leavesAcceptChildren ? [] : ['make-child'],
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
    mode,
    level,
    branch,
    open,
    blockInstruction,
    canDrop,
    onOpenChange,
    onCancelExpand,
    shouldSeedNativeDragData,
  ]);

  useEffect(() => () => onCancelExpand(), [onCancelExpand]);

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
      // The live drop instruction, so a test can read which zone the pointer is in rather than
      // inferring it from the indicator's classes (make-child and reparent render identically).
      data-instruction={instruction?.type}
      data-testid={props.testId}
      className={mx(
        'grid grid-cols-subgrid col-[tree-row] mt-0.5 outline-none cursor-pointer select-none',
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
        'dx-focus-ring-inset',
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
        props.className,
      )}
      onClick={handleClick}
      onMouseEnter={handleItemHover}
      onContextMenu={handleContextMenu}
    >
      <div className='indent relative grid grid-cols-subgrid col-[tree-row]' style={paddingIndentation(level)}>
        {/* `items-start`: a row with a description is taller than one control, and centring put the
            disclosure chevron beside the description rather than beside the title it discloses. */}
        <div role='none' className='flex items-start'>
          {branch ? (
            <TreeView.BranchTrigger asChild>
              {/* zag stamps data-state=open on the trigger, which the ghost button styles as an
                  open menu trigger (bg-input-bg) — the chevron must stay transparent. */}
              <TreeItemToggle isBranch open={open} classNames='data-[state=open]:bg-transparent' />
            </TreeView.BranchTrigger>
          ) : (
            <TreeItemToggle isBranch={false} />
          )}
          {RenderHeading ? (
            <RenderHeading item={item} path={path} props={props} open={open} />
          ) : (
            <TreeNodeHeading item={item} path={path} props={props} />
          )}
        </div>
        {Columns && <Columns item={item} path={path} open={open} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />}
        {instruction && <TreeDropIndicator instruction={instruction} gap={2} />}
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
          'grow shrink flex items-center min-w-0 gap-2 ps-0.5 min-h-(--dx-control) cursor-pointer select-none',
          props.disabled && 'cursor-default',
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
