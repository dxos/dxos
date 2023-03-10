//
// Copyright 2023 DXOS.org
//

import React, { FC, ReactNode } from 'react';

// TODO(burdon): Factor out as hook.
export const styles = {
  bg: 'bg-white dark:bg-neutral-800',
  border: 'border-zinc-500',
  heading: 'text-black dark:text-white',
  body: 'text-neutral-600'
};

// TODO(burdon): ListItemEndcap density.
export const Icon: FC<{ children: ReactNode }> = ({ children }) => (
  <div className='flex flex-col shrink-0 items-center justify-center w-[40px] h-[40px]'>{children}</div>
);
