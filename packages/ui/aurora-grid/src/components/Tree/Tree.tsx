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
  items?: string[]; // TODO(burdon): Change to TData.
};

const TreeRoot = ({
  id,
  debug,
  items = [],
  Component = TreeItem,
  onDrop,
  children,
}: PropsWithChildren<TreeRootProps>) => {
  return (
    <AuroraTree.Root>
      {/* TODO(wittjosiah): This is Stack.Root. */}
      <MosaicContainer container={{ id, debug, Component, isDroppable: () => true, onDrop }}>
        <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
          {children}
          {/* TODO(burdon): Component for placeholder at end. */}
        </SortableContext>
      </MosaicContainer>
    </AuroraTree.Root>
  );
};

export type TreeData = {
  id: string;
  title?: string;
  items: TreeData[];
};

/**
 * Pure component that is used by the mosaic overlay.
 */
const TreeItem: MosaicTileComponent<TreeData> = forwardRef(
  ({ container, draggableStyle, draggableProps, data, position, isActive, isDragging, className }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        style={draggableStyle}
        className={mx('flex flex-col m-2 p-2 ring bg-white font-mono text-xs', className)}
        {...draggableProps}
      >
        {data.title ?? data.id}
        {!isActive && !isDragging && data.items && <TreeBranch container={container} id={data.id} items={data.items} />}
      </div>
    );
  },
);

const TreeBranch = ({ container, id, items }: { container: string; id: string; items: TreeData[] }) => {
  const parent = `${container}/branch/${id}`;
  const sortedItems = useSortedItems({
    container: parent,
    items,
    isDroppable: (active) => {
      // TODO(wittjosiah): This should be configurable.
      return active.container !== container;
    },
  });

  return (
    <AuroraTreeItem.Body>
      <SortableContext id={id} items={sortedItems} strategy={verticalListSortingStrategy}>
        {sortedItems.map((child, i) => (
          <AuroraTree.Branch key={child.id}>
            <TreeTile item={child} parent={parent} index={i} />
          </AuroraTree.Branch>
        ))}
      </SortableContext>
    </AuroraTreeItem.Body>
  );
};

// TODO(burdon): Draggable item.
const TreeTile = ({
  item,
  index,
  parent,
  onSelect,
}: {
  item: TreeData;
  index: number;
  parent?: string;
  onSelect?: () => void;
}) => {
  const { id: container, Component = TreeItem } = useContainer();
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { container: parent ?? container, item, position: index } satisfies MosaicDraggedItem,
  });

  return (
    <AuroraTreeItem.Root collapsible defaultOpen>
      {/* TODO(wittjosiah): This is Stack.Tile. */}
      <Component
        ref={setNodeRef}
        data={item}
        container={parent ?? container}
        position={index}
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

export const Tree = {
  Root: TreeRoot,
  Tile: TreeTile,
};
