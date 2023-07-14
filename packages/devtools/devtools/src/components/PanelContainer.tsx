//
// Copyright 2023 DXOS.org
//

import React, { FC, ReactNode } from 'react';

import { mx } from '@dxos/aurora-theme';

export const PanelContainer: FC<{ toolbar?: ReactNode; children: ReactNode; className?: string }> = ({
  toolbar,
  children,
  className,
}) => {
  return (
    <div className='flex flex-col flex-1 overflow-hidden divide-y'>
      {toolbar}
      <div className={mx('flex flex-1 flex-col overflow-auto', className)}>{children}</div>
    </div>
  );
};

export const Toolbar: FC<{ children: ReactNode }> = ({ children }) => (
  <div className='flex space-x-2 p-2'>{children}</div>
);
