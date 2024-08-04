//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Sheet, type SheetRootProps } from './Sheet';

const SheetComponent = ({ sheet }: SheetRootProps) => {
  return (
    <Sheet.Root sheet={sheet}>
      <Sheet.Grid />
      <Sheet.StatusBar />
    </Sheet.Root>
  );
};

export default SheetComponent;
