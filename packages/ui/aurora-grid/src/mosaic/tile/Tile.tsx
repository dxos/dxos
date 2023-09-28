//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Card, CardTileProps, Stack, StackTileProps, TreeItem, TreeItemTileProps } from './variants';
import { TileProps } from '../mosaic';

/**
 *
 */
export const Tile = forwardRef<HTMLDivElement, TileProps>((props, forwardedRef) => {
  switch (props.variant) {
    case 'treeitem': // TODO(burdon): item?
      return <TreeItem {...(props as TreeItemTileProps)} ref={forwardedRef} />;
    case 'card':
      return <Card {...(props as CardTileProps)} ref={forwardedRef} />;
    case 'stack': // TODO(burdon): section?
      return <Stack {...(props as StackTileProps)} ref={forwardedRef} />;
    default:
      return null;
  }
});
