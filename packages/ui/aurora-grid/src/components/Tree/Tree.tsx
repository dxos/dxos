//
// Copyright 2023 DXOS.org
//

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { PropsWithChildren, forwardRef } from 'react';

import { Tree as AuroraTree, TreeItem as AuroraTreeItem } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import {
  MosaicContainerProps,
  MosaicContainerProvider,
  MosaicDataItem,
  MosaicDraggedItem,
  MosaicTileComponent,
  useContainer,
  useSortedItems,
} from '../../dnd';

// TODO(burdon): Tree data model that provides a pure abstraction of the plugin Graph.
//  - The Tree (like Stack, Grid) is a high level container that assembles Radix style Aurora components from a model.
//  - Models in general should be easily mapped from the Graph and/or ECHO queries.
//  - See: https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/examples-tree-sortable--basic-setup

type TreeRootProps = MosaicContainerProps<any, number> & {
  items?: string[];
};

const TreeRoot = ({ id, items = [], Component = TreeItem, onMoveItem, children }: PropsWithChildren<TreeRootProps>) => {
  return (
    <AuroraTree.Root>
      {/* TODO(wittjosiah): This is Stack.Root. */}
      <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
        <MosaicContainerProvider container={{ id, Component, onMoveItem }}>
          {children}
          {/* TODO(burdon): Component for placeholder at end. */}
        </MosaicContainerProvider>
      </SortableContext>
    </AuroraTree.Root>
  );
};

// TODO(burdon): Draggable item.
const TreeTile = ({ item, index, onSelect }: { item: MosaicDataItem; index: number; onSelect?: () => void }) => {
  const { id: container, Component } = useContainer();
  const { setNodeRef, attributes, listeners, transform, isDragging } = useSortable({
    id: item.id,
    data: { container, item, position: index } satisfies MosaicDraggedItem,
  });

  return (
    <AuroraTreeItem.Root collapsible defaultOpen>
      {/* TODO(wittjosiah): This is Stack.Tile. */}
      <Component
        ref={setNodeRef}
        isDragging={isDragging}
        draggableStyle={{
          transform: transform ? CSS.Transform.toString(Object.assign(transform, { scaleY: 1 })) : undefined,
        }}
        draggableProps={{ ...attributes, ...listeners }}
        className={mx(isDragging && 'opacity-30')}
        data={item}
        onSelect={onSelect}
      />
    </AuroraTreeItem.Root>
  );
};

type TreeData = {
  id: string;
  children?: TreeData[];
};

/**
 * Pure component that is used by the mosaic overlay.
 */
const TreeItem: MosaicTileComponent<TreeData> = forwardRef(
  ({ draggableStyle, draggableProps, data, isActive, isDragging, className }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        style={draggableStyle}
        className={mx('flex flex-col m-2 p-2 ring bg-white font-mono text-xs', className)}
        {...draggableProps}
      >
        {data.id}
        {!isActive && !isDragging && data.children && <TreeBranch id={data.id} items={data.children} />}
      </div>
    );
  },
);

const TreeBranch = ({ id, items }: { id: string; items: TreeData[] }) => {
  const { Component, onMoveItem } = useContainer();
  const sortedItems = useSortedItems(id, items);
  return (
    <AuroraTreeItem.Body>
      {/* TODO(wittjosiah): This is Stack.Root. */}
      <SortableContext id={id} items={sortedItems} strategy={verticalListSortingStrategy}>
        <MosaicContainerProvider container={{ id, Component, onMoveItem }}>
          {sortedItems.map((child, i) => (
            <AuroraTree.Branch key={child.id}>
              <TreeTile item={child} index={i} />
            </AuroraTree.Branch>
          ))}
        </MosaicContainerProvider>
      </SortableContext>
    </AuroraTreeItem.Body>
  );
};

export const Tree = {
  Root: TreeRoot,
  Tile: TreeTile,
};
