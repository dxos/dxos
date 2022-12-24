//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React, { FC, ReactNode } from 'react';

export const Card: FC<{ title: string; className?: string; menubar?: ReactNode; children?: ReactNode }> = ({
  title,
  className = 'bg-gray-400',
  menubar,
  children
}) => {
  return (
    <div className='flex flex-1 flex-col overflow-hidden drop-shadow-md'>
      <div className={clsx('flex p-2 _rounded-tl-lg _rounded-tr-lg', className)}>
        <h2 className='text-lg'>{title}</h2>
        <div className='flex-1' />
        {menubar}
      </div>
      <div className='flex flex-1 flex-col overflow-y-scroll bg-white'>{children}</div>
    </div>
  );
};
