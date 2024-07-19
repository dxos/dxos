//
// Copyright 2023 DXOS.org
//

import { type DragMoveEvent } from '@dnd-kit/core';
import React, { type CSSProperties, type FC, useCallback } from 'react';

import { Treegrid } from '@dxos/react-ui';
import { useContainer, Mosaic, type MosaicContainerProps, useMosaic } from '@dxos/react-ui-mosaic';

import { NavTreeProvider, type NavTreeProviderProps } from './NavTreeContext';
import { NavTreeItem as NavTreeItemComponent } from './NavTreeItem';
import { navTreeColumns, DEFAULT_INDENTATION } from './navtree-fragments';
import {
  type NavTreeItemNode,
  type NavTreeItemPosition,
  type NavTreeItemMoveDetails,
  type NavTreeNode,
} from '../types';
import { getLevel } from '../util';

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
    | 'renderPresence'
    | 'indentation'
    | 'resolveItemLevel'
  >
> &
  Omit<
    MosaicContainerProps<NavTreeNode, NavTreeItemPosition, NavTreeItemMoveDetails>,
    'debug' | 'Component' | 'id' | 'onSelect'
  >;

type NavTreeMosaicContainer = FC<MosaicContainerProps<NavTreeItemNode, NavTreeItemPosition, NavTreeItemMoveDetails>>;

const defaultOnMove = (event: DragMoveEvent) => {
  return { depthOffset: Math.floor(event.delta.x / DEFAULT_INDENTATION) };
};

const defaultIndentation = (level: number): CSSProperties => {
  return { paddingInlineStart: `${(level - 1) * DEFAULT_INDENTATION}px` };
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
  renderPresence,
  onOver,
  onDrop,
  onMove = defaultOnMove,
  resolveItemLevel,
  indentation = defaultIndentation,
  classNames,
}: NavTreeProps) => {
  const Container = Mosaic.Container as NavTreeMosaicContainer;
  const { activeItem } = useMosaic();

  const getOverlayStyle = useCallback(() => {
    const level = 'path' in (activeItem?.item ?? {}) ? getLevel((activeItem!.item as NavTreeItemNode).path) : 1;
    return {
      gridTemplateColumns: navTreeColumns(!!renderPresence),
      // TODO(thure): why does this blink and why does dnd-kit return it to a position where this is zero?
      ...indentation(level),
    };
  }, [activeItem, indentation, renderPresence]);

  return (
    <Container
      {...{
        id,
        Component: NavTreeItemComponent,
        type,
        onOver,
        onDrop,
        onMove,
        getOverlayStyle,
      }}
    >
      <NavTreeProvider
        current={current}
        attended={attended}
        open={open}
        popoverAnchorId={popoverAnchorId}
        onNavigate={onNavigate}
        onItemOpenChange={onItemOpenChange}
        renderPresence={renderPresence}
        resolveItemLevel={resolveItemLevel}
        indentation={indentation}
      >
        <Treegrid.Root gridTemplateColumns={navTreeColumns(!!renderPresence)} classNames={classNames}>
          <NavTreeImpl items={items} />
        </Treegrid.Root>
      </NavTreeProvider>
    </Container>
  );
};
