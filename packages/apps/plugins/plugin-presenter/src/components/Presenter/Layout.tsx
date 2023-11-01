//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import { mx } from '@dxos/react-ui-theme';

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
    <div className={mx('flex grow relative overflow-hidden', className ?? 'bg-white dark:bg-black')}>
      <div className={mx('flex flex-col grow overflow-hidden')}>{children}</div>

      <div className='z-[200]'>
        <div className='absolute top-4 left-4'>{topLeft}</div>
        <div className='absolute top-4 right-4'>{topRight}</div>
        <div className='absolute bottom-4 left-4'>{bottomLeft}</div>
        <div className='absolute bottom-4 right-4'>{bottomRight}</div>
      </div>
    </div>
  );
};
