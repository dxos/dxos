//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Card } from '@dxos/aurora';

import { type MosaicTileComponent } from './Tile';
import { type MosaicDataItem } from './types';
import { Path } from './util';

export const DefaultComponent: MosaicTileComponent<MosaicDataItem> = forwardRef(
  ({ draggableStyle, draggableProps, item: { id }, path }, forwardRef) => {
    return (
      <Card.Root ref={forwardRef} style={draggableStyle}>
        <Card.Header>
          <Card.DragHandle {...draggableProps} />
          <Card.Title title={Path.create(path, id)} classNames='truncate font-mono text-xs' />
        </Card.Header>
      </Card.Root>
    );
  },
);

DefaultComponent.displayName = 'DefaultComponent';
