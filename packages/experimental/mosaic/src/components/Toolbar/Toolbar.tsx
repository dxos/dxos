//
// Copyright 2023 DXOS.org
//

import React, { type FC, type ReactNode } from 'react';

import { ElevationProvider } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export const Toolbar: FC<{ children?: ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <ElevationProvider elevation='group'>
      <div className={mx('flex shrink-0 w-full p-2 items-center', className)}>{children}</div>
    </ElevationProvider>
  );
};
