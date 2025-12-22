//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode, forwardRef } from 'react';

import { invariant } from '@dxos/invariant';
import { Icon, IconButton, type ThemedClassName } from '@dxos/react-ui';
import { useEditorContext, useShapeDef } from '@dxos/react-ui-canvas-editor';
import { type Shape } from '@dxos/react-ui-canvas-editor';
import { mx } from '@dxos/ui-theme';

export const headerHeight = 32;
export const footerHeight = 32;

export type BoxActionHandler = (action: 'run' | 'open' | 'close') => void;

export type BoxProps = PropsWithChildren<
  ThemedClassName<{
    shape: Shape;
    title?: string;
    status?: string | ReactNode;
    open?: boolean;
    onAction?: BoxActionHandler;
  }>
>;

export const Box = forwardRef<HTMLDivElement, BoxProps>(
  ({ children, classNames, shape, title, status, open, onAction }, forwardedRef) => {
    invariant(shape.type);
    const { icon, name, openable } = useShapeDef(shape.type) ?? { icon: 'ph--placeholder--regular' };
    const { debug } = useEditorContext();

    return (
      <div ref={forwardedRef} className='flex flex-col bs-full is-full justify-between'>
        <div className='flex shrink-0 is-full justify-between items-center bs-[32px] bg-hoverSurface'>
          <Icon icon={icon} classNames='mx-2' />
          <div className='grow text-sm truncate'>{debug ? shape.type : (name ?? shape.text ?? title)}</div>
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
        <div className={mx('flex flex-col bs-full grow overflow-hidden', classNames)}>{children}</div>
        <div className='flex shrink-0 is-full justify-between items-center bs-[32px] bg-hoverSurface'>
          <div className='grow pli-2 text-sm truncate'>{debug ? shape.id : status}</div>
          {openable && (
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
