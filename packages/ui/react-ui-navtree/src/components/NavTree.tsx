//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Tree } from '@dxos/react-ui';
import { useContainer, Mosaic, type MosaicContainerProps } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/react-ui-theme';

import { NavTreeProvider, type NavTreeProviderProps } from './NavTreeContext';
import { NavTreeMosaicComponent } from './NavTreeItem';
import type { TreeNode } from '../types';

export const DEFAULT_TYPE = 'tree-item';

const NavTreeImpl = ({ node }: { node: TreeNode }) => {
  const { id, Component, type } = useContainer();

  return (
    <Mosaic.SortableContext id={id} items={node.children} direction='vertical'>
      {node.children.map((node, index) => (
        <Mosaic.SortableTile
          key={node.id}
          item={{ ...node, level: 0 }}
          path={id}
          type={type}
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
  renderPresence?: NavTreeProviderProps['renderPresence'];
} & Omit<MosaicContainerProps<TreeNode, number>, 'debug' | 'Component' | 'id'>;

export const NavTree = ({
  node,
  current,
  type = DEFAULT_TYPE,
  popoverAnchorId,
  onSelect,
  isOver = defaultIsOver,
  renderPresence,
  onOver,
  onDrop,
  className,
}: NavTreeProps) => {
  return (
    <Mosaic.Container
      {...{
        id: node.id,
        Component: NavTreeMosaicComponent,
        type,
        onOver,
        onDrop,
      }}
    >
      <Tree.Root classNames={mx('flex flex-col', className)}>
        <NavTreeProvider
          current={current}
          popoverAnchorId={popoverAnchorId}
          onSelect={onSelect}
          isOver={isOver}
          renderPresence={renderPresence}
        >
          <NavTreeImpl node={node} />
        </NavTreeProvider>
      </Tree.Root>
    </Mosaic.Container>
  );
};
