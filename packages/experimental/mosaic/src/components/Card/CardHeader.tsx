//
// Copyright 2023 DXOS.org
//

import React, { ReactNode } from 'react';

import { mx } from '@dxos/react-components';

export type CardHeaderSlots = {
  root?: {
    className?: string;
  };
};

export type CardHeaderProps = {
  slots?: CardHeaderSlots;
  icon?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
};

export const CardHeader = ({ slots = {}, icon, action, children }: CardHeaderProps) => {
  return (
    <div className={mx('flex w-full h-[40px] items-center', slots.root?.className)}>
      {icon && <div className='flex shrink-0 justify-center w-[40px]'>{icon}</div>}
      <div className='flex w-full'>{children}</div>
      {action && <div className='flex shrink-0 justify-center w-[40px]'>{action}</div>}
    </div>
  );
};
