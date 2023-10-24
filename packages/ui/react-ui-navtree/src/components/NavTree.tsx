//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Tree } from '@dxos/react-ui';
import { useContainer, useSortedItems, Mosaic, type MosaicContainerProps } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/react-ui-theme';

import { NavTreeProvider, type NavTreeProviderProps } from './NavTreeContext';
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

const defaultIsOver: NavTreeProviderProps['isOver'] = ({ path, operation, overItem }) =>
  overItem?.path === path && (operation === 'transfer' || operation === 'copy');

export type NavTreeProps = {
  node: TreeNode;
  current?: NavTreeProviderProps['current'];
  popoverAnchorId?: NavTreeProviderProps['popoverAnchorId'];
  onSelect?: NavTreeProviderProps['onSelect'];
  isOver?: NavTreeProviderProps['isOver'];
} & Omit<MosaicContainerProps<TreeNode, number>, 'debug' | 'Component' | 'id'>;

export const NavTree = ({
  node,
  current,
  popoverAnchorId,
  onSelect,
  isOver = defaultIsOver,
  onOver,
  onDrop,
  compare,
  className,
}: NavTreeProps) => {
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
        <NavTreeProvider current={current} popoverAnchorId={popoverAnchorId} onSelect={onSelect} isOver={isOver}>
          <NavTreeImpl node={node} />
        </NavTreeProvider>
      </Tree.Root>
    </Mosaic.Container>
  );
};
