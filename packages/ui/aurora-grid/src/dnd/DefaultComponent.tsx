//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical } from '@phosphor-icons/react';
import React, { forwardRef } from 'react';

import { getSize, mx } from '@dxos/aurora-theme';

import { MosaicDataItem, MosaicTileProps } from './types';

export const DefaultComponent = forwardRef<HTMLDivElement, MosaicTileProps<MosaicDataItem>>(
  ({ draggableStyle, draggableProps, data: { id } }, forwardRef) => {
    return (
      <div ref={forwardRef} style={draggableStyle} className='flex ring bg-white font-mono text-xs'>
        <div {...draggableProps}>
          <DotsSixVertical className={mx(getSize(5))} />
        </div>
        <div>{id}</div>
      </div>
    );
  },
);

DefaultComponent.displayName = 'DefaultComponent';
