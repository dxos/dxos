//
// Copyright 2023 DXOS.org
//

import React, { FC, ReactNode } from 'react';

import { mx } from '@dxos/aurora-theme';

// TODO(burdon): Factor out as hook.
export const styles = {
  bg: 'bg-white dark:bg-neutral-800',
  frame: 'md:shadow md:rounded __border __border-neutral-300',
  divide: 'divide-y divide-y-reverse __divide-neutral-300',
  heading: 'text-black dark:text-white',
  body: 'text-neutral-600'
};

// TODO(burdon): ListItemEndcap density.
export const Icon: FC<{ className?: string; children?: ReactNode }> = ({ className, children }) => (
  <div className={mx('flex flex-col shrink-0 items-center justify-center w-[40px] h-[40px]', className)}>
    {children}
  </div>
);
