//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, type PropsWithChildren } from 'react';

import { Icon, IconButton, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useEditorContext, useShapeDef } from '../../../hooks';
import { type Shape } from '../../../types';

export const headerHeight = 32;
export const footerHeight = 32;

export type BoxActionHandler = (action: 'run' | 'open' | 'close') => void;

export type BoxProps = PropsWithChildren<
  ThemedClassName<{
    shape: Shape;
    name?: string;
    status?: string;
    open?: boolean;
    onAction?: BoxActionHandler;
  }>
>;

export const Box = forwardRef<HTMLDivElement, BoxProps>(
  ({ children, classNames, shape, name: _name, status, open, onAction }, forwardedRef) => {
    const { icon, name, resizable } = useShapeDef(shape.type) ?? { icon: 'ph--placeholder--regular', resizable: false };
    const { debug } = useEditorContext();

    return (
      <div ref={forwardedRef} className='flex flex-col h-full w-full justify-between'>
        <div className='flex shrink-0 w-full justify-between items-center h-[32px] bg-hoverSurface'>
          <Icon icon={icon} classNames='mx-2' />
          <div className='grow text-sm truncate'>{debug ? shape.type : shape.text ?? _name ?? name}</div>
          <IconButton
            classNames='p-1 text-green-500'
            variant='ghost'
            icon='ph--play--regular'
            size={4}
            label='run'
            iconOnly
            onDoubleClick={(ev) => ev.stopPropagation()}
            onClick={(ev) => {
              ev.stopPropagation();
              onAction?.('run');
            }}
          />
        </div>
        <div className={mx('flex flex-col h-full grow overflow-hidden', classNames)}>{children}</div>
        <div className='flex shrink-0 w-full justify-between items-center h-[32px] bg-hoverSurface'>
          <div className='grow ps-2 text-sm truncate'>{debug ? shape.id : status}</div>
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
