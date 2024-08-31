//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type LayoutProps = ThemedClassName<
  PropsWithChildren<{
    className?: string;
    topLeft?: ReactNode;
    topRight?: ReactNode;
    bottomLeft?: ReactNode;
    bottomRight?: ReactNode;
  }>
>;

export const Layout = ({ children, classNames, topLeft, topRight, bottomLeft, bottomRight }: LayoutProps) => {
  return (
    <div className={mx('surface-attention relative flex grow overflow-hidden', classNames)}>
      <div className={mx('flex grow flex-col overflow-hidden')}>{children}</div>

      <div className='z-[200]'>
        <div className='absolute left-4 top-4'>{topLeft}</div>
        <div className='absolute right-4 top-4'>{topRight}</div>
        <div className='absolute bottom-4 left-4'>{bottomLeft}</div>
        <div className='absolute bottom-4 right-4'>{bottomRight}</div>
      </div>
    </div>
  );
};
