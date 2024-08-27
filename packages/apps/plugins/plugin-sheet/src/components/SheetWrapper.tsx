//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type LayoutCoordinate } from '@dxos/app-framework';
import { mx } from '@dxos/react-ui-theme';

import { Sheet, type SheetRootProps } from './Sheet';

const SheetWrapper = ({
  sheet,
  role,
  coordinate = { part: 'main', entryId: '' },
}: SheetRootProps & { role?: string; coordinate?: LayoutCoordinate }) => {
  return (
    <div role='none' className={mx(role === 'section' && 'aspect-square', role === 'article' && 'row-span-2')}>
      <Sheet.Root sheet={sheet}>
        <Sheet.Main
          classNames={['border-bs', coordinate.part !== 'solo' && 'border-is', role === 'section' && 'border-be']}
        />
      </Sheet.Root>
    </div>
  );
};

export default SheetWrapper;
