//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type LayoutCoordinate } from '@dxos/app-framework';
import { mx } from '@dxos/react-ui-theme';

import { Sheet, type SheetRootProps } from './Sheet';

const SheetContainer = ({
  sheet,
  space,
  role,
  coordinate = { part: 'main', entryId: '' },
}: SheetRootProps & { role?: string; coordinate?: LayoutCoordinate }) => {
  return (
    <div
      role='none'
      className={mx(
        'flex',
        role === 'article' && 'row-span-2', // TODO(burdon): Container with toolbar.
        role === 'section' && 'aspect-square border-y border-is border-separator',
        coordinate.part !== 'solo' && 'border-is border-separator',
      )}
    >
      <Sheet.Root sheet={sheet} space={space}>
        <Sheet.Main />
      </Sheet.Root>
    </div>
  );
};

export default SheetContainer;
