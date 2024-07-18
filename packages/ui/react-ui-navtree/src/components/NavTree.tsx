//
// Copyright 2023 DXOS.org
//

import { type DragMoveEvent } from '@dnd-kit/core';
import React, { type FC } from 'react';

import { Treegrid } from '@dxos/react-ui';
import { useContainer, Mosaic, type MosaicContainerProps } from '@dxos/react-ui-mosaic';

import { NavTreeProvider, type NavTreeProviderProps } from './NavTreeContext';
import { NavTreeItem as NavTreeItemComponent } from './NavTreeItem';
import { navTreeColumns, INDENTATION } from './navtree-fragments';
import {
  type NavTreeItemNode,
  type NavTreeItemPosition,
  type NavTreeItemMoveDetails,
  type NavTreeNode,
} from '../types';

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
  Omit<
    MosaicContainerProps<NavTreeNode, NavTreeItemPosition, NavTreeItemMoveDetails>,
    'debug' | 'Component' | 'id' | 'onSelect'
  >;

type NavTreeMosaicContainer = FC<MosaicContainerProps<NavTreeItemNode, NavTreeItemPosition, NavTreeItemMoveDetails>>;

const defaultOnMove = (event: DragMoveEvent) => {
  return { depthOffset: Math.round(event.delta.x / INDENTATION) };
};

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
  onMove = defaultOnMove,
  classNames,
}: NavTreeProps) => {
  const Container = Mosaic.Container as NavTreeMosaicContainer;

  return (
    <Container
      {...{
        id,
        Component: NavTreeItemComponent,
        type,
        onOver,
        onDrop,
        onMove,
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
        <Treegrid.Root gridTemplateColumns={navTreeColumns(!!renderPresence)} classNames={classNames}>
          <NavTreeImpl items={items} />
        </Treegrid.Root>
      </NavTreeProvider>
    </Container>
  );
};
