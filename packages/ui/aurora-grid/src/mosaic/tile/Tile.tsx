//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Card, CardTile, Stack, StackTile, TreeItem, TreeItemTile } from './variants';

// TODO(burdon): Make generic to unbundle deps.
export type TileVariantInstances = CardTile | StackTile | TreeItemTile;

/**
 *
 */
const Tile = forwardRef<HTMLDivElement, TileVariantInstances>((props, forwardedRef) => {
  switch (props.variant) {
    case 'treeitem': // TODO(burdon): item?
      return <TreeItem {...props} ref={forwardedRef} />;
    case 'card':
      return <Card {...props} ref={forwardedRef} />;
    case 'stack': // TODO(burdon): section?
      return <Stack {...props} ref={forwardedRef} />;
    default:
      return null;
  }
});

export { Tile, Stack, Card, TreeItem };
