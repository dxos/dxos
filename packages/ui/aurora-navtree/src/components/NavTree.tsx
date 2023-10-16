//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Tree } from '@dxos/aurora';
import { useContainer, useSortedItems, Mosaic, type MosaicContainerProps } from '@dxos/aurora-grid/next';
import { mx } from '@dxos/aurora-theme';

import { type NavTreeContextType, NavTreeProvider } from './NavTreeContext';
import { NavTreeItem } from './NavTreeItem';
import type { TreeNode } from '../types';

const NavTreeImpl = ({ node }: { node: TreeNode }) => {
  const { id, Component } = useContainer();
  const sortedNodes = useSortedItems(node.children);

  return (
    <Mosaic.SortableContext id={id} items={sortedNodes} direction='vertical'>
      {sortedNodes.map((node, index) => (
        <Mosaic.SortableTile
          key={node.id}
          item={{ id: node.id, node, level: 0 }}
          path={id}
          position={index}
          Component={Component!}
        />
      ))}
    </Mosaic.SortableContext>
  );
};

export type NavTreeProps = {
  node: TreeNode;
  current?: NavTreeContextType['current'];
  onSelect?: NavTreeContextType['onSelect'];
} & Omit<MosaicContainerProps<TreeNode, number>, 'debug' | 'Component' | 'id'>;

export const NavTree = ({ node, current, onSelect, onOver, onDrop, compare, className }: NavTreeProps) => {
  return (
    <Mosaic.Container
      {...{
        id: node.id,
        Component: NavTreeItem,
        onOver,
        onDrop,
        compare,
      }}
    >
      <Tree.Root classNames={mx('flex flex-col', className)}>
        <NavTreeProvider current={current} onSelect={onSelect}>
          <NavTreeImpl node={node} />
        </NavTreeProvider>
      </Tree.Root>
    </Mosaic.Container>
  );
};
