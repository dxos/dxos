//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, type PropsWithChildren } from 'react';

import { IconButton, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export const headerHeight = 32;
export const footerHeight = 32;

export type BoxProps = PropsWithChildren<
  ThemedClassName<{
    name: string;
    status?: string;
    open?: boolean;
    resizable?: boolean;
    onAction?: (action: 'run' | 'open' | 'close') => void;
  }>
>;

export const Box = forwardRef<HTMLDivElement, BoxProps>(
  ({ children, classNames, name, status, open, resizable, onAction }, forwardedRef) => {
    return (
      <div ref={forwardedRef} className='flex flex-col h-full w-full justify-between'>
        <div className='flex shrink-0 w-full justify-between items-center h-[32px] bg-hoverSurface'>
          <div className='grow ps-2 text-sm truncate'>{name}</div>
          <IconButton
            classNames='p-1 text-green-500'
            variant='ghost'
            icon='ph--play--regular'
            size={4}
            label='run'
            iconOnly
            onClick={(ev) => {
              ev.stopPropagation();
              onAction?.('run');
            }}
          />
        </div>
        <div className={mx('flex flex-col h-full grow overflow-hidden', classNames)}>{children}</div>
        <div className='flex shrink-0 w-full justify-between items-center h-[32px] bg-hoverSurface'>
          <div className='grow ps-2 text-sm truncate'>{status}</div>
          {resizable && (
            <IconButton
              classNames='p-1'
              variant='ghost'
              icon={open ? 'ph--caret-up--regular' : 'ph--caret-down--regular'}
              size={4}
              label={open ? 'close' : 'open'}
              iconOnly
              onClick={(ev) => {
                ev.stopPropagation();
                onAction?.(open ? 'close' : 'open');
              }}
            />
          )}
        </div>
      </div>
    );
  },
);
