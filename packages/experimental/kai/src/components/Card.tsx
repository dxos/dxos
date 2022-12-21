//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React, { FC, ReactNode } from 'react';

export const Card: FC<{ title: string; color?: string; menubar: ReactNode; children: ReactNode }> = ({
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

export const Table: FC<{ sidebar: ReactNode; header: ReactNode; children: ReactNode }> = ({
  sidebar,
  header,
  children
}) => {
  return (
    <div className='flex'>
      <table className='table-fixed w-full overflow-hidden'>
        <tbody>
          <tr>
            <td className='w-8'>
              <div className='flex m-1'>{sidebar}</div>
            </td>
            <td>
              <div>{header}</div>
            </td>
          </tr>
          <tr>
            <td></td>
            <td>
              <div className='flex flex-col'>{children}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
