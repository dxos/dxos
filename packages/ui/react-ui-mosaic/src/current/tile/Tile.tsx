//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Card, Kanban, Stack, TreeItem, isCardTile, isKanbanTile, isStackTile, isTreeItemTile } from './variants';
import { type TileProps } from '../mosaic';

/**
 * Tiles are elements that form a hierarchy of elements that can be dragged and dropped.
 * Tiles may be leaf nodes or containers.
 */
// TODO(burdon): Factory?
export const Tile = forwardRef<HTMLDivElement, TileProps>((props, forwardedRef) => {
  if (isTreeItemTile(props)) {
    return <TreeItem {...props} ref={forwardedRef} />;
  } else if (isCardTile(props)) {
    return <Card {...props} ref={forwardedRef} />;
  } else if (isStackTile(props)) {
    return <Stack {...props} ref={forwardedRef} />;
  } else if (isKanbanTile(props)) {
    return <Kanban {...props} ref={forwardedRef} />;
  } else {
    return null;
  }
});
