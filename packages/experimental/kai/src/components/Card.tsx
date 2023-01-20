//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode } from 'react';

import { mx } from '@dxos/react-components';

export const CardMenu: FC<{ title: string; children?: ReactNode }> = ({ title, children }) => {
  return (
    <div className='flex w-full p-1 items-center bg-slate-200 rounded-t'>
      <h2>{title}</h2>
      <div className='flex-1' />
      {children}
    </div>
  );
};

// TODO(burdon): Responsive layout (compact, narrow, wide).

export const Card: FC<{
  children?: ReactNode;
  scrollbar?: boolean;
  header?: JSX.Element;
}> = ({ scrollbar, header, children }) => {
  return (
    <div className='flex flex-col w-full bg-white overflow-hidden shadow'>
      {header}

      <div className={mx('flex flex-1 flex-col bg-white', scrollbar ? 'overflow-auto' : 'overflow-hidden')}>
        {children}
      </div>
    </div>
  );
};
