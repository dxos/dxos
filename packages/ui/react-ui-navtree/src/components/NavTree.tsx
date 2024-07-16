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
    | 'open'
    | 'current'
    | 'attended'
    | 'popoverAnchorId'
    | 'onNavigate'
    | 'onItemOpenChange'
    | 'isOver'
    | 'renderPresence'
  >
> &
  Omit<MosaicContainerProps<NavTreeNode, number>, 'debug' | 'Component' | 'id' | 'onSelect'>;

export const NavTree = ({
  id,
  items,
  current,
  attended,
  open,
  type = DEFAULT_TYPE,
  popoverAnchorId,
  onNavigate,
  onItemOpenChange,
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
        open={open}
        popoverAnchorId={popoverAnchorId}
        onNavigate={onNavigate}
        onItemOpenChange={onItemOpenChange}
        isOver={isOver}
        renderPresence={renderPresence}
      >
        <Treegrid.Root
          gridTemplateColumns={
            renderPresence
              ? '[navtree-row-start] min-content 1fr min-content min-content min-content [navtree-row-end]'
              : '[navtree-row-start] min-content 1fr min-content min-content [navtree-row-end]'
          }
          classNames={classNames}
        >
          <NavTreeImpl items={items} />
        </Treegrid.Root>
      </NavTreeProvider>
    </Mosaic.Container>
  );
};
