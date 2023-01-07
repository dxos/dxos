//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode } from 'react';

import { mx } from '@dxos/react-components';

export const Card: FC<{
  title?: string;
  className?: string;
  menubar?: ReactNode;
  children?: ReactNode;
  scrollbar?: boolean;
  fade?: boolean;
}> = ({ title, className = 'bg-gray-400', menubar, scrollbar, fade, children }) => {
  return (
    <div className='flex flex-1 flex-col overflow-hidden drop-shadow-md'>
      <div className={mx('flex p-2', className)}>
        <h2 className='text-lg'>{title ?? 'Card'}</h2>
        <div className='flex-1' />
        {menubar}
      </div>

      <div
        className={mx(
          'flex flex-1 flex-col bg-white',
          scrollbar ? 'overflow-auto scrollbar-thin' : 'overflow-hidden',
          fade && 'fade'
        )}
      >
        {children}
      </div>
    </div>
  );
};
