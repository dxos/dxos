//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Tree } from '@dxos/aurora';
import { useContainer, useSortedItems, Mosaic, type MosaicContainerProps } from '@dxos/aurora-grid/next';

import { NavTreeItem } from './NavTreeItem';
import { type TreeNode } from './props';

const NavTreeImpl = ({ node }: { node: TreeNode }) => {
  const { id, Component } = useContainer();
  const sortedItems = useSortedItems(node.children);

  return (
    <Mosaic.SortableContext id={id} items={sortedItems} direction='vertical'>
      {sortedItems.map((item, index) => (
        <Mosaic.SortableTile key={item.id} item={item} path={id} position={index} Component={Component!} />
      ))}
    </Mosaic.SortableContext>
  );
};

export type NavTreeProps = { node: TreeNode } & Omit<MosaicContainerProps<TreeNode, number>, 'debug' | 'Component'>;

export const NavTree = ({ node, id, onOver, onDrop, compare }: NavTreeProps) => {
  return (
    <Mosaic.Container
      {...{
        id,
        Component: NavTreeItem,
        onOver,
        onDrop,
        compare,
      }}
    >
      <Tree.Root classNames='flex flex-col'>
        <NavTreeImpl node={node} />
      </Tree.Root>
    </Mosaic.Container>
  );
};
