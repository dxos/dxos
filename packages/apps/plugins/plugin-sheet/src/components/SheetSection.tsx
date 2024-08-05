//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Sheet, type SheetRootProps } from './Sheet';

const SheetSection = ({ sheet }: SheetRootProps) => {
  return (
    <div role='none' className='flex flex-col is-full overflow-auto'>
      <Sheet.Root sheet={sheet}>
        <Sheet.Grid />
        <Sheet.StatusBar />
      </Sheet.Root>
    </div>
  );
};

export default SheetSection;
