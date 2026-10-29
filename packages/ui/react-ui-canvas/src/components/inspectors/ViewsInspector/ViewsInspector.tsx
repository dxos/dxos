//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Tree,
  type TreeData,
  type TreeDropEvent,
  type TreeRootHandle,
  type TreeSelectEvent,
  createStaticTreeModel,
  filterTreeModel,
} from '@dxos/react-ui-list';
import * as Input from '@dxos/react-ui/Input';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { mx } from '@dxos/ui-theme';

import { useRegistry } from '../../../hooks/index.ts';
import { type ElementId, type ViewId, type ViewMap } from '../../../model/index.ts';
import {
  type ViewPlace,
  type ViewReorder,
  type ViewRowSelection,
  type ViewTreeItem,
  buildViewTree,
  canRestack,
  isSelectableRow,
  rowPlace,
  samePlace,
  selectRows,
  viewReorder,
} from '../../../utils/index.ts';
import { type InspectorProps } from '../types.ts';

export type ViewsInspectorProps = InspectorProps & {
  scenes?: ViewMap;
  /** The canvas's root View. */
  root?: ViewId;
  /** The rows to show, built by the caller; otherwise built from `scenes` under `root`. */
  tree?: ViewTreeItem;
  /** What the canvas shows: the open View's path, or the Object open in isolation and the path within it. */
  place?: ViewPlace;
  /** The canvas selection, in the open View: the rows of these elements show as selected, and the first is revealed. */
  selected?: ReadonlySet<ElementId>;
  /** A row was activated: open the selection's place and select `selection.ids` there; `item` is the row activated. */
  onSelect?: (selection: ViewRowSelection, item: ViewTreeItem) => void;
  /** Opens a View in the viewport, by its path from the root. */
  onOpen?: (path: ViewId[]) => void;
  /** A row was dragged before or after a sibling in the open View: restack its element in `container`'s drawing order. */
  onReorder?: (event: ViewReorder) => void;
};

const ICONS: Record<string, string> = {
  rect: 'ph--square--regular',
  ellipse: 'ph--circle--regular',
  cloud: 'ph--cloud--regular',
  polygon: 'ph--hexagon--regular',
  polyline: 'ph--line-segments--regular',
  note: 'ph--note--regular',
  path: 'ph--pen-nib--regular',
  view: 'ph--frame-corners--regular',
  instance: 'ph--cube--regular',
};

const iconFor = (item: ViewTreeItem): string =>
  item.kind === 'view'
    ? 'ph--frame-corners--regular'
    : item.kind === 'link'
      ? 'ph--line-segment--regular'
      : ((item.type && ICONS[item.type]) ?? 'ph--shapes--regular');

const EMPTY_TREE: ViewTreeItem = { id: 'empty', kind: 'view', path: [], label: '', children: [] };

/** The synthetic root the tree model needs, so the root View is a row of its own. */
const ROOT = '__views';
/** The Tree's id, which starts every row's path. */
const TREE_ID = 'views';
type Row = ViewTreeItem | { id: typeof ROOT; children: ViewTreeItem[] };
const isItem = (row: Row): row is ViewTreeItem => row.id !== ROOT;

// The default tracks plus one for the row's action.
const COLUMNS = 'var(--dx-half-block-size) var(--dx-block-size) minmax(0, 1fr) min-content min-content';

/** Whether a row matches the filter text, by its label or its type. */
const matches = (item: ViewTreeItem, text: string) =>
  item.label.toLowerCase().includes(text) || (item.type ?? item.kind).toLowerCase().includes(text);

/**
 * The views tree (VIEWS.md §4, decision 3): the root View, its nodes and links, the Views nested in it, and inside
 * each instance its object's contents, read-only. Activating a row reports the selection it asks for; a View row
 * opens (Enter or a double-click); a filter narrows the rows by label or type.
 */
export const ViewsInspector = ({
  classNames,
  scenes,
  root,
  tree: treeProp,
  place,
  selected,
  onSelect,
  onOpen,
  onReorder,
}: ViewsInspectorProps) => {
  const registry = useRegistry();
  const treeRef = useRef<TreeRootHandle>(null);
  const tree = useMemo(
    () => treeProp ?? (scenes && root ? buildViewTree(scenes, root) : EMPTY_TREE),
    [treeProp, scenes, root],
  );

  // Every row with its path as the Tree keys it, for the selection, the reveal and a double-click's lookup.
  const rows = useMemo(() => {
    const all = new Map<string, { item: ViewTreeItem; path: string[] }>();
    const walk = (item: ViewTreeItem, parent: string[]) => {
      const rowPath = [...parent, item.id];
      all.set(item.id, { item, path: rowPath });
      item.children.forEach((child) => walk(child, rowPath));
    };
    walk(tree, [TREE_ID]);
    return all;
  }, [tree]);

  const isCurrent = useCallback(
    (item: ViewTreeItem) =>
      isSelectableRow(item) &&
      item.element !== undefined &&
      (selected?.has(item.element) ?? false) &&
      samePlace(place, rowPlace(item)),
    [selected, place],
  );
  const isCurrentRef = useRef(isCurrent);
  isCurrentRef.current = isCurrent;

  // Open state outlives the model, which is rebuilt with each edit: keyed by path, a row stays as the user left it.
  const openRef = useRef(new Map<string, boolean>());
  const model = useMemo(
    () =>
      createStaticTreeModel<Row>(
        { id: ROOT, children: [tree] },
        {
          getChildren: (row) => (row.children.length > 0 ? row.children : undefined),
          getProps: (row) =>
            isItem(row)
              ? {
                  label: row.label,
                  icon: iconFor(row),
                  testId: `views-row-${row.id}`,
                  ...(row.kind === 'view' ? { count: row.children.length } : {}),
                  draggable: row.container !== undefined,
                }
              : {},
          // The root View starts open, to show what the canvas holds; everything below it waits closed.
          isOpen: (row, rowPath) => openRef.current.get(rowPath.join(' ')) ?? (row.id === ROOT || row === tree),
          isCurrent: (row) => isItem(row) && isCurrentRef.current(row),
        },
      ),
    [tree],
  );

  const [filter, setFilter] = useState('');
  const text = filter.trim().toLowerCase();
  const shown = useMemo(
    () => (text.length > 0 ? filterTreeModel<Row>(model, (row) => isItem(row) && matches(row, text)) : model),
    [model, text],
  );

  useEffect(() => {
    for (const { item, path: rowPath } of rows.values()) {
      const current = isCurrent(item);
      const atom = model.stateAtom(rowPath);
      const state = registry.get(atom);
      if (state.current !== current) {
        registry.set(atom, { ...state, current });
      }
    }
  }, [rows, isCurrent, model, registry]);

  // The canvas selection brings its row into view without taking focus, which stays with the canvas.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  useEffect(() => {
    const first = [...rowsRef.current.values()].find(({ item }) => isCurrentRef.current(item));
    first && treeRef.current?.reveal(first.path, { focus: false });
  }, [selected, place]);

  const onOpenChange = useCallback(
    ({ path: rowPath, open }: { path: string[]; open: boolean }) => {
      openRef.current.set(rowPath.join(' '), open);
      const atom = model.stateAtom(rowPath);
      registry.set(atom, { ...registry.get(atom), open });
    },
    [model, registry],
  );

  // The host owns the selection; the rows follow it through the effect above.
  const handleSelect = useCallback(
    ({ item, current, meta, keyboard, range }: TreeSelectEvent<Row>) => {
      if (!isItem(item)) {
        return;
      }
      if (keyboard && item.kind === 'view' && onOpen) {
        onOpen(item.path);
        return;
      }
      const selection = selectRows({
        item,
        range: range?.flatMap((row) => (isItem(row.item) ? [row.item] : [])),
        meta,
        current,
        selection: selected ?? new Set(),
        place,
      });
      selection && onSelect?.(selection, item);
    },
    [onSelect, onOpen, selected, place],
  );

  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      const id =
        event.target instanceof Element
          ? event.target.closest('[data-tree-row]')?.getAttribute('data-object-id')
          : undefined;
      const item = id ? rows.get(id)?.item : undefined;
      if (item?.kind === 'view' && onOpen) {
        onOpen(item.path);
      }
    },
    [rows, onOpen],
  );

  // A row moves only among its siblings, as a restack of their container's drawing order.
  const canDrop = useCallback(({ source, target }: { source: TreeData; target: TreeData }) => {
    const from: Row = source.item;
    const to: Row = target.item;
    return isItem(from) && isItem(to) && canRestack(from, to);
  }, []);
  const handleDrop = useCallback(
    ({ instruction, source, target }: TreeDropEvent<Row>) => {
      const from: Row = source.item;
      const to: Row = target.item;
      const reorder =
        isItem(from) && isItem(to) && canRestack(from, to) ? viewReorder(from, to, instruction.type) : undefined;
      reorder && onReorder?.(reorder);
    },
    [onReorder],
  );

  return (
    <div className={mx('flex flex-col min-h-0', classNames)} data-testid='views' onDoubleClick={handleDoubleClick}>
      <Toolbar.Root>
        <Input.Root
          placeholder='Filter'
          value={filter}
          noAutoFill
          autoComplete='off'
          spellCheck={false}
          data-testid='views-filter'
          onChange={(event) => setFilter(event.target.value)}
        />
      </Toolbar.Root>
      <Tree.Root
        ref={treeRef}
        model={shown}
        rootId={model.rootId}
        id={TREE_ID}
        selectionMode='multiple'
        columns={COLUMNS}
        draggable={onReorder !== undefined}
        canSelect={({ item }) => isItem(item) && (isSelectableRow(item) || item.kind === 'view')}
        canDrop={canDrop}
        getDropKind={({ instruction }) =>
          instruction.type === 'reorder-above' || instruction.type === 'reorder-below' ? 'move' : 'reject'
        }
        onOpenChange={onOpenChange}
        onSelect={handleSelect}
        onDrop={handleDrop}
      >
        <Tree.Label srOnly>Views</Tree.Label>
        {/* The inspector panel scrolls its sections, so the rows take their full height rather than scroll here. */}
        <Tree.Content scroll={false} />
      </Tree.Root>
    </div>
  );
};
