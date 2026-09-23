//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode, forwardRef } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Icon, IconButton, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useComputeContext } from '../../hooks/compute-context.ts';
import { type ComputeShape } from '../defs.ts';

export type BoxActionHandler = (action: 'open' | 'close') => void;

export type BoxProps = PropsWithChildren<
  ThemedClassName<{
    shape: ComputeShape;
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
    const { controller, registry, debug = false } = useComputeContext();
    const { icon, name, openable } = registry?.getShapeDef(shape.type) ?? { icon: 'ph--circle-dashed--regular' };

    // Running a node propagates to everything downstream of it, which is what the button means; a shape
    // with no compute node behind it has nothing to run, so it does not get one.
    const nodeId = shape.node;
    const handleRun = () => {
      controller.exec(nodeId).catch((err) => log.catch(err));
    };

    return (
      <div ref={forwardedRef} className='flex flex-col dx-fill justify-between'>
        <div className='flex shrink-0 w-full justify-between items-center h-[32px] dx-input-surface'>
          <Icon icon={icon} classNames='mx-2' />
          <div className='grow text-sm truncate'>{debug ? shape.type : (name ?? shape.text ?? title)}</div>
          {nodeId && (
            <IconButton
              classNames='p-1 text-green-500'
              variant='ghost'
              icon='ph--play--regular'
              label='run'
              iconOnly
              onPointerDown={(ev) => ev.stopPropagation()}
              onDoubleClick={(ev) => ev.stopPropagation()}
              onClick={(ev) => {
                ev.stopPropagation();
                handleRun();
              }}
            />
          )}
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
