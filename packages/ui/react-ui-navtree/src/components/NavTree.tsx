//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Treegrid } from '@dxos/react-ui';
import { useContainer, Mosaic, type MosaicContainerProps } from '@dxos/react-ui-mosaic';

import { NavTreeProvider, type NavTreeProviderProps } from './NavTreeContext';
import { NavTreeItem as NavTreeItemComponent } from './NavTreeItem';
import { type NavTreeItemNode, type NavTreeNode } from '../types';

export const DEFAULT_TYPE = 'tree-item';

const NavTreeImpl = ({ items }: { items: NavTreeItemNode[] }) => {
  const { id, Component, type } = useContainer();

  return (
    <Mosaic.SortableContext id={id} items={items} direction='vertical'>
      {items.map((item, index) => (
        <Mosaic.SortableTile key={item.id} item={item} path={id} type={type} position={index} Component={Component!} />
      ))}
    </Mosaic.SortableContext>
  );
};

const defaultIsOver: NavTreeProviderProps['isOver'] = ({ path, operation, overItem }) =>
  overItem?.path === path && (operation === 'transfer' || operation === 'copy');

export type NavTreeProps = {
  id: string;
  items: NavTreeItemNode[];
} & Partial<
  Pick<
    NavTreeProviderProps,
    'current' | 'attended' | 'popoverAnchorId' | 'onSelect' | 'onToggle' | 'isOver' | 'renderPresence'
  >
> &
  Omit<MosaicContainerProps<NavTreeNode, number>, 'debug' | 'Component' | 'id' | 'onSelect'>;

export const NavTree = ({
  id,
  items,
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
        id,
        Component: NavTreeItemComponent,
        type,
        onOver,
        onDrop,
      }}
    >
      <NavTreeProvider
        current={current}
        attended={attended}
        popoverAnchorId={popoverAnchorId}
        onSelect={onSelect}
        onToggle={onToggle}
        isOver={isOver}
        renderPresence={renderPresence}
      >
        <Treegrid.Root gridTemplateColumns='1fr' classNames={classNames}>
          <NavTreeImpl items={items} />
        </Treegrid.Root>
      </NavTreeProvider>
    </Mosaic.Container>
  );
};
