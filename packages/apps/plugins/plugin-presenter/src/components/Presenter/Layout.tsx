//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import { mx } from '@dxos/aurora-theme';

export type LayoutProps = PropsWithChildren<{
  className?: string;
  classes?: { [selector: string]: string };
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
}>;

export const Layout = ({ children, className, topLeft, topRight, bottomLeft, bottomRight }: LayoutProps) => {
  return (
    <div className={mx('flex grow relative overflow-hidden select-none', className ?? 'bg-white dark:bg-black')}>
      <div className={mx('flex flex-col grow m-16 overflow-hidden')}>{children}</div>

      <div className='absolute inset-4 z-[200]'>
        <div className='absolute top-0 left-0'>{topLeft}</div>
        <div className='absolute top-0 right-0'>{topRight}</div>
        <div className='absolute bottom-0 left-0'>{bottomLeft}</div>
        <div className='absolute bottom-0 right-0'>{bottomRight}</div>
      </div>
    </div>
  );
};
