//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import {
  Card,
  CardTileProps,
  Kanban,
  KanbanTileProps,
  Stack,
  StackTileProps,
  TreeItem,
  TreeItemTileProps,
} from './variants';
import { TileProps } from '../mosaic';

/**
 * Tiles are elements that form a hierarchy of elements that can be dragged and dropped.
 * Tiles may be leaf nodes or containers.
 */
// TODO(burdon): Factory?
export const Tile = forwardRef<HTMLDivElement, TileProps>((props, forwardedRef) => {
  switch (props.variant) {
    case 'treeitem':
      return <TreeItem {...(props as TreeItemTileProps)} ref={forwardedRef} />;
    case 'card':
      return <Card {...(props as CardTileProps)} ref={forwardedRef} />;
    case 'stack':
      return <Stack {...(props as StackTileProps)} ref={forwardedRef} />;
    case 'kanban':
      return <Kanban {...(props as KanbanTileProps)} ref={forwardedRef} />;
    default:
      return null;
  }
});
