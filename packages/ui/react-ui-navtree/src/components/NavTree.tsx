//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Tree } from '@dxos/react-ui';
import { useContainer, Mosaic, type MosaicContainerProps } from '@dxos/react-ui-mosaic';

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
} & Partial<
  Pick<
    NavTreeProviderProps,
    'current' | 'attended' | 'popoverAnchorId' | 'onSelect' | 'onToggle' | 'isOver' | 'renderPresence'
  >
> &
  Omit<MosaicContainerProps<TreeNode, number>, 'debug' | 'Component' | 'id' | 'onSelect'>;

export const NavTree = ({
  node,
  current,
  attended,
  type = DEFAULT_TYPE,
  popoverAnchorId,
  onSelect,
  onToggle,
  isOver = defaultIsOver,
  renderPresence,
  onOver,
  onDrop,
  classNames,
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
      <Tree.Root classNames={['flex flex-col', classNames]}>
        <NavTreeProvider
          current={current}
          attended={attended}
          popoverAnchorId={popoverAnchorId}
          onSelect={onSelect}
          onToggle={onToggle}
          isOver={isOver}
          renderPresence={renderPresence}
        >
          <NavTreeImpl node={node} />
        </NavTreeProvider>
      </Tree.Root>
    </Mosaic.Container>
  );
};
