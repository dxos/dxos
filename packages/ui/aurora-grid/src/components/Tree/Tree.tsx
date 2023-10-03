//
// Copyright 2023 DXOS.org
//

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React, { PropsWithChildren, forwardRef } from 'react';

import { Tree as AuroraTree, TreeItem as AuroraTreeItem } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import {
  MosaicContainerProps,
  MosaicContainer,
  MosaicDataItem,
  MosaicDraggedItem,
  MosaicTileComponent,
  useContainer,
  useSortedItems,
  getTransformCSS,
} from '../../dnd';

// TODO(burdon): Tree data model that provides a pure abstraction of the plugin Graph.
// - The Tree (like Stack, Grid) is a high level container that assembles Radix style Aurora components from a model.
// - Models in general should be easily mapped from the Graph and/or ECHO queries.
// - See: https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/examples-tree-sortable--basic-setup

type TreeRootProps = MosaicContainerProps<any, number> & {
  items?: string[];
};

const TreeRoot = ({ id, items = [], Component, onDrop, children }: PropsWithChildren<TreeRootProps>) => {
  return (
    <AuroraTree.Root>
      {/* TODO(wittjosiah): This is Stack.Root. */}
      <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
        <MosaicContainer container={{ id, Component, isDroppable: () => true, onDrop }}>
          {children}
          {/* TODO(burdon): Component for placeholder at end. */}
        </MosaicContainer>
      </SortableContext>
    </AuroraTree.Root>
  );
};

// TODO(burdon): Draggable item.
const TreeTile = ({ item, index, onSelect }: { item: MosaicDataItem; index: number; onSelect?: () => void }) => {
  const { id: container, Component = TreeItem } = useContainer();
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { container, item, position: index } satisfies MosaicDraggedItem,
  });

  return (
    <AuroraTreeItem.Root collapsible defaultOpen>
      {/* TODO(wittjosiah): This is Stack.Tile. */}
      <Component
        ref={setNodeRef}
        data={item}
        container={container}
        isDragging={isDragging}
        draggableStyle={{
          transform: getTransformCSS(transform),
          transition,
        }}
        draggableProps={{ ...attributes, ...listeners }}
        className={mx(isDragging && 'opacity-0')}
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
  const { Component, onDrop } = useContainer();
  const sortedItems = useSortedItems({ container: id, items });
  return (
    <AuroraTreeItem.Body>
      {/* TODO(wittjosiah): This is Stack.Root. */}
      <SortableContext id={id} items={sortedItems} strategy={verticalListSortingStrategy}>
        <MosaicContainer container={{ id, Component, isDroppable: () => true, onDrop }}>
          {sortedItems.map((child, i) => (
            <AuroraTree.Branch key={child.id}>
              <TreeTile item={child} index={i} />
            </AuroraTree.Branch>
          ))}
        </MosaicContainer>
      </SortableContext>
    </AuroraTreeItem.Body>
  );
};

export const Tree = {
  Root: TreeRoot,
  Tile: TreeTile,
};
