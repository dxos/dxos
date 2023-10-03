//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Card } from '@dxos/aurora';

import { MosaicDataItem, MosaicTileProps } from './types';

export const DefaultComponent = forwardRef<HTMLDivElement, MosaicTileProps<MosaicDataItem, any>>(
  ({ draggableStyle, draggableProps, data: { id }, container }, forwardRef) => {
    return (
      <Card.Root ref={forwardRef} style={draggableStyle}>
        <Card.Header>
          <Card.DragHandle {...draggableProps} />
          <Card.Title title={`${container}/${id}`} classNames='truncate font-mono text-xs' />
        </Card.Header>
      </Card.Root>
    );
  },
);

DefaultComponent.displayName = 'DefaultComponent';
