//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { Tree } from '@dxos/react-ui';
import { useContainer, Mosaic, type MosaicContainerProps, useItemsWithPreview } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/react-ui-theme';

import { NavTreeProvider, type NavTreeProviderProps } from './NavTreeContext';
import { NavTreeItem } from './NavTreeItem';
import type { TreeNode } from '../types';

const NavTreeImpl = ({ node }: { node: TreeNode }) => {
  const { id, Component, compare } = useContainer();
  const sortedItems = useMemo(() => {
    return compare ? [...node.children].sort(compare) : node.children;
  }, [node.children, compare]);
  const itemsWithPreview = useItemsWithPreview({ items: sortedItems, path: id, strategy: 'layout-stable' });

  return (
    <Mosaic.SortableContext id={id} items={itemsWithPreview} direction='vertical'>
      {itemsWithPreview.map((node, index) => (
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
