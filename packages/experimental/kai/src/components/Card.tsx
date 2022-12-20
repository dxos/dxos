//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React, { FC, ReactNode } from 'react';

export const Card: FC<{ title: string; color?: string; menubar: ReactNode; children: ReactNode | ReactNode[] }> = ({
  title,
  color = 'bg-gray-400',
  menubar,
  children
}) => {
  return (
    <div className='flex flex-1 flex-col drop-shadow-md border-sky-500'>
      <div className={clsx('flex p-2 rounded-tl-lg rounded-tr-lg', color)}>
        <h2 className='text-lg'>{title}</h2>
        <div className='flex-1' />
        {menubar}
      </div>
      <div className='flex flex-1 flex-col overflow-y-scroll bg-white'>{children}</div>
    </div>
  );
};
