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
  remoteFunctionUrl,
}: SheetRootProps & { role?: string; coordinate?: LayoutCoordinate }) => {
  return (
    <div
      role='none'
      className={mx(
        'flex',
        role === 'article' && 'row-span-2',
        role === 'section' && 'aspect-square border-y border-is border-separator',
      )}
    >
      <Sheet.Root sheet={sheet} space={space} remoteFunctionUrl={remoteFunctionUrl}>
        <Sheet.Main />
      </Sheet.Root>
    </div>
  );
};

export default SheetContainer;
