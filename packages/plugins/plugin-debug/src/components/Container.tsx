//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

// TODO(burdon): Convert to grid.
export const Container = ({ toolbar, children }: PropsWithChildren<{ toolbar: ReactNode }>) => (
  <div role='none' className='flex flex-col grow overflow-hidden divide-y divide-separator'>
    {toolbar}
    <div className='flex flex-col grow overflow-auto'>{children}</div>
  </div>
);
