//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode, forwardRef } from 'react';

import { invariant } from '@dxos/invariant';
import { Icon, IconButton, type ThemedClassName } from '@dxos/react-ui';
import { type CanvasBoard } from '@dxos/react-ui-canvas-editor';
import { mx } from '@dxos/ui-theme';

import { useComputeContext } from '../../hooks/compute-context.ts';

export type BoxActionHandler = (action: 'run' | 'open' | 'close') => void;

export type BoxProps = PropsWithChildren<
  ThemedClassName<{
    shape: CanvasBoard.Shape;
    title?: string;
    status?: string | ReactNode;
    open?: boolean;
    onAction?: BoxActionHandler;
  }>
>;

export const Box = forwardRef<HTMLDivElement, BoxProps>(
  ({ children, classNames, shape, title, status, open, onAction }, forwardedRef) => {
    invariant(shape.type);
    // The chrome comes from the host's registry, whichever surface the shape is mounted in.
    const { registry, debug = false } = useComputeContext();
    const { icon, name, openable } = registry?.getShapeDef(shape.type) ?? { icon: 'ph--circle-dashed--regular' };

    return (
      <div ref={forwardedRef} className='flex flex-col dx-fill justify-between'>
        <div className='flex shrink-0 w-full justify-between items-center h-[32px] dx-input-surface'>
          <Icon icon={icon} classNames='mx-2' />
          <div className='grow text-sm truncate'>{debug ? shape.type : (name ?? shape.text ?? title)}</div>
          <IconButton
            classNames='p-1 text-green-500'
            variant='ghost'
            icon='ph--play--regular'
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
        <div className='flex shrink-0 w-full justify-between items-center h-[32px] dx-input-surface'>
          <div className='grow px-2 text-sm truncate'>{debug ? shape.id : status}</div>
          {openable && (
            <IconButton
              classNames='p-1'
              variant='ghost'
              icon={open ? 'ph--caret-up--regular' : 'ph--caret-down--regular'}
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
