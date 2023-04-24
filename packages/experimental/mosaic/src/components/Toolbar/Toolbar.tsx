//
// Copyright 2023 DXOS.org
//

import React, { FC, ReactNode } from 'react';

import { ElevationProvider, mx } from '@dxos/aurora';

export const Toolbar: FC<{ children?: ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <ElevationProvider elevation='group'>
      <div className={mx('flex shrink-0 w-full p-2 items-center', className)}>{children}</div>
    </ElevationProvider>
  );
};
