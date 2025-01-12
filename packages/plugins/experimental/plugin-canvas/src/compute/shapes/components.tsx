//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { IconButton, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export const headerHeight = 32;
export const footerHeight = 24;

export type BoxProps = PropsWithChildren<
  ThemedClassName<{
    name: string;
    status?: string;
    onAction?: () => void;
  }>
>;

export const Box = ({ children, classNames, name, status, onAction }: BoxProps) => {
  return (
    <div className='flex flex-col h-full w-full justify-between'>
      <div className='flex shrink-0 w-full justify-between items-center h-[32px] bg-hoverSurface'>
        <div className='ps-2 text-sm truncate'>{name}</div>
        <IconButton
          classNames='p-1 text-green-500'
          variant='ghost'
          icon='ph--play--regular'
          size={4}
          label='run'
          iconOnly
          onClick={(ev) => {
            ev.stopPropagation();
            onAction?.();
          }}
        />
      </div>
      <div className={mx('flex flex-col h-full grow overflow-hidden', classNames)}>{children}</div>
      <div className='flex shrink-0 ps-2 items-center text-sm bg-hoverSurface h-[24px]'>{status}</div>
    </div>
  );
};
