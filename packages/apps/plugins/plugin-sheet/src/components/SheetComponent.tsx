//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Sheet, type SheetRootProps } from './Sheet';

// TODO(burdon): Factor out Article.
const SheetComponent = ({ sheet }: SheetRootProps) => {
  return (
    <div role='none' className='flex flex-col row-span-2 is-full overflow-auto'>
      <Sheet.Root sheet={sheet}>
        <Sheet.Grid />
        <Sheet.StatusBar />
      </Sheet.Root>
    </div>
  );
};

export default SheetComponent;
