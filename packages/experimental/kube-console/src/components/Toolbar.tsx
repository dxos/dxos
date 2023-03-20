//
// Copyright 2023 DXOS.org
//

import React, { FC, PropsWithChildren } from 'react';

// TODO(burdon): Radix.
export const Toolbar: FC<PropsWithChildren> = ({ children }) => {
  return <div className='flex w-full shrink-0 p-2 space-x-2'>{children}</div>;
};
