//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef } from 'react';

import { Tree, type TreeNode, type TreeSelectEvent, createStaticTreeModel } from '@dxos/react-ui-list';
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
};

const ICONS: Record<string, string> = {
  rect: 'ph--square--regular',
  ellipse: 'ph--circle--regular',
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
type Row = ViewTreeItem | { id: typeof ROOT; children: ViewTreeItem[] };
const isItem = (row: Row): row is ViewTreeItem => row.id !== ROOT;

// The default tracks plus one for the row's action.
const COLUMNS = 'var(--dx-half-block-size) var(--dx-block-size) minmax(0, 1fr) min-content min-content';

/**
 * The views tree (VIEWS.md §4, decision 3): the root View, its nodes and links, the Views nested in it, and inside
 * each instance its object's contents, read-only. Selecting a row reports it to the host; a View row opens it.
 */
export const ViewsInspector = ({ classNames, scenes, root, selected, onSelect, onOpen }: ViewsInspectorProps) => {
  const registry = useRegistry();
  const tree = useMemo(() => buildViewTree(scenes, root), [scenes, root]);
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
                }
              : {},
          // The root View starts open, to show what the canvas holds; everything below it waits closed.
          isOpen: (row) => row.id === ROOT || row === tree,
          isCurrent: (row) => isItem(row) && row.element !== undefined && (selected?.has(row.element) ?? false),
        },
      ),
    [tree, selected],
  );
  const currentRef = useRef<string[] | undefined>(undefined);

  const onOpenChange = useCallback(
    ({ path, open }: { path: string[]; open: boolean }) => {
      const atom = model.stateAtom(path);
      registry.set(atom, { ...registry.get(atom), open });
    },
    [model, registry],
  );

  const handleSelect = useCallback(
    ({ item, path, current }: TreeSelectEvent<Row>) => {
      if (current && currentRef.current) {
        const previous = model.stateAtom(currentRef.current);
        registry.set(previous, { ...registry.get(previous), current: false });
      }
      const atom = model.stateAtom(path);
      registry.set(atom, { ...registry.get(atom), current });
      currentRef.current = current ? path : undefined;
      if (current && isItem(item)) {
        onSelect?.(item);
      }
    },
    [model, registry, onSelect],
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
        id='views'
        selectionMode='multiple'
        columns={COLUMNS}
        onOpenChange={onOpenChange}
        onSelect={handleSelect}
      >
        <Tree.Label srOnly>Views</Tree.Label>
        <Tree.Content>{renderRow}</Tree.Content>
      </Tree.Root>
    </div>
  );
};
