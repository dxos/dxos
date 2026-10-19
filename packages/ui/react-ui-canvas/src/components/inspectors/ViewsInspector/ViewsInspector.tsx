//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo } from 'react';

import {
  Tree,
  type TreeData,
  type TreeDropEvent,
  type TreeNode,
  type TreeSelectEvent,
  createStaticTreeModel,
} from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import { mx } from '@dxos/ui-theme';

import { useRegistry } from '../../../hooks/index.ts';
import { type ElementId, type SceneId, type SceneMap } from '../../../model/index.ts';
import { type ViewTreeItem, buildViewTree } from '../../../utils/index.ts';
import { type InspectorProps } from '../types.ts';

export type ViewsInspectorProps = InspectorProps & {
  scenes: SceneMap;
  /** The canvas's root View. */
  root: SceneId;
  /** The canvas selection: the rows of these elements show as selected. */
  selected?: ReadonlySet<ElementId>;
  /** A row was picked: select its element on the canvas, in the View it belongs to (`item.path`). */
  onSelect?: (item: ViewTreeItem) => void;
  /** Opens a View in the viewport, by its path from the root. */
  onOpen?: (path: SceneId[]) => void;
  /** A row was dragged before or after a sibling: restack its element in `container`'s drawing order. */
  onReorder?: (event: ViewReorderEvent) => void;
};

export type ViewReorderEvent = {
  container: SceneId;
  element: ElementId;
  target: ElementId;
  position: 'before' | 'after';
};

const ICONS: Record<string, string> = {
  rect: 'ph--square--regular',
  ellipse: 'ph--circle--regular',
  cloud: 'ph--cloud--regular',
  note: 'ph--note--regular',
  path: 'ph--pen-nib--regular',
  frame: 'ph--frame-corners--regular',
  instance: 'ph--cube--regular',
};

const iconFor = (item: ViewTreeItem): string =>
  item.kind === 'view'
    ? 'ph--frame-corners--regular'
    : item.kind === 'link'
      ? 'ph--line-segment--regular'
      : ((item.type && ICONS[item.type]) ?? 'ph--shapes--regular');

/** The synthetic root the tree model needs, so the root View is a row of its own. */
const ROOT = '__views';
/** The Tree's id, which starts every row's path. */
const TREE_ID = 'views';
type Row = ViewTreeItem | { id: typeof ROOT; children: ViewTreeItem[] };
const isItem = (row: Row): row is ViewTreeItem => row.id !== ROOT;

// The default tracks plus one for the row's action.
const COLUMNS = 'var(--dx-half-block-size) var(--dx-block-size) minmax(0, 1fr) min-content min-content';

/**
 * The views tree (VIEWS.md §4, decision 3): the root View, its nodes and links, the Views nested in it, and inside
 * each instance its object's contents, read-only. Selecting a row reports it to the host; a View row opens it.
 */
export const ViewsInspector = ({
  classNames,
  scenes,
  root,
  selected,
  onSelect,
  onOpen,
  onReorder,
}: ViewsInspectorProps) => {
  const registry = useRegistry();
  const tree = useMemo(() => buildViewTree(scenes, root), [scenes, root]);
  // Made once per tree, not per selection: a new model starts every row closed, so a click would collapse its branch.
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
                  // Placed objects' contents are drawn where they are defined, so they stay where they are.
                  draggable: !row.readonly && row.container !== undefined,
                }
              : {},
          // The root View starts open, to show what the canvas holds; everything below it waits closed.
          isOpen: (row) => row.id === ROOT || row === tree,
        },
      ),
    [tree],
  );

  // Every row with its path as the Tree keys it, for writing the selection into the rows' state.
  const rows = useMemo(() => {
    const all: { item: ViewTreeItem; path: string[] }[] = [];
    const walk = (item: ViewTreeItem, parent: string[]) => {
      const path = [...parent, item.id];
      all.push({ item, path });
      item.children.forEach((child) => walk(child, path));
    };
    walk(tree, [TREE_ID]);
    return all;
  }, [tree]);
  useEffect(() => {
    for (const { item, path } of rows) {
      const current = !item.readonly && item.element !== undefined && (selected?.has(item.element) ?? false);
      const atom = model.stateAtom(path);
      const state = registry.get(atom);
      if (state.current !== current) {
        registry.set(atom, { ...state, current });
      }
    }
  }, [rows, selected, model, registry]);

  const onOpenChange = useCallback(
    ({ path, open }: { path: string[]; open: boolean }) => {
      const atom = model.stateAtom(path);
      registry.set(atom, { ...registry.get(atom), open });
    },
    [model, registry],
  );

  // The host owns the selection; the rows follow it through the effect above.
  const handleSelect = useCallback(
    ({ item, current }: TreeSelectEvent<Row>) => {
      if (current && isItem(item)) {
        onSelect?.(item);
      }
    },
    [onSelect],
  );

  // A row moves only among its siblings, as a restack: another container is another View's drawing.
  const canDrop = useCallback(({ source, target }: { source: TreeData; target: TreeData }) => {
    const from: Row = source.item;
    const to: Row = target.item;
    return (
      isItem(from) &&
      isItem(to) &&
      !to.readonly &&
      from.container !== undefined &&
      from.container === to.container &&
      (from.kind === 'link') === (to.kind === 'link')
    );
  }, []);
  const handleDrop = useCallback(
    ({ instruction, source, target }: TreeDropEvent<Row>) => {
      const from: Row = source.item;
      const to: Row = target.item;
      if (!isItem(from) || !isItem(to) || !from.container || !from.element || !to.element) {
        return;
      }
      if (instruction.type === 'reorder-above' || instruction.type === 'reorder-below') {
        onReorder?.({
          container: from.container,
          element: from.element,
          target: to.element,
          position: instruction.type === 'reorder-above' ? 'before' : 'after',
        });
      }
    },
    [onReorder],
  );

  const renderRow = useCallback(
    (node: TreeNode<Row>) => {
      const item = node.item && isItem(node.item) ? node.item : undefined;
      return (
        <Tree.Item node={node}>
          <Tree.ItemIndicator />
          <Tree.ItemIcon />
          <Tree.ItemText />
          <Tree.ItemCount />
          {item?.kind === 'view' && onOpen && (
            <Tree.ItemActions>
              <Button.Root
                variant='ghost'
                iconOnly
                size='sm'
                icon='ph--arrow-square-in--regular'
                label='Open view'
                data-testid={`views-open-${item.id}`}
                onClick={() => onOpen(item.path)}
              />
            </Tree.ItemActions>
          )}
        </Tree.Item>
      );
    },
    [onOpen],
  );

  return (
    <div className={mx('flex flex-col min-h-0', classNames)} data-testid='views'>
      <Tree.Root
        model={model}
        rootId={model.rootId}
        id={TREE_ID}
        selectionMode='multiple'
        columns={COLUMNS}
        draggable={onReorder !== undefined}
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
        <Tree.Content scroll={false}>{renderRow}</Tree.Content>
      </Tree.Root>
    </div>
  );
};
