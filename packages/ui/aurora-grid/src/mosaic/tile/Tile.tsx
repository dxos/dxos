//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Card } from './Card';
import { Stack } from './Stack';
import { TreeItem } from './TreeItem';
import { TileProps } from '../types';

/**
 * Draggable component.
 */
const Tile = forwardRef<HTMLDivElement, TileProps>((props: TileProps, forwardedRef) => {
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
