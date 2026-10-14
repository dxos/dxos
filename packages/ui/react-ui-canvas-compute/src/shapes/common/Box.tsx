//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode, forwardRef } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { useComputeContext, useComputeNodeDef } from '../../hooks/compute-context.ts';
import { type ComputeShape } from '../defs.ts';

export type BoxActionHandler = (action: 'open' | 'close') => void;

export type BoxProps = PropsWithChildren<
  Util.ThemedClassName<{
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
    // The chrome comes from the node registry the scene renders with.
    const { controller, debug = false } = useComputeContext();
    const def = useComputeNodeDef();
    const icon = def?.icon ?? 'ph--circle-dashed--regular';
    const name = def?.name;
    const openable = def?.openable;

    // Running a node propagates to everything downstream of it, which is what the button means; a shape
    // with no compute node behind it has nothing to run, so it does not get one.
    const nodeId = shape.node;
    const handleRun = () => {
      controller.exec(nodeId).catch((err) => log.catch(err));
    };

    return (
      <div ref={forwardedRef} className='flex flex-col dx-fill justify-between'>
        <div className='flex shrink-0 w-full justify-between items-center h-[32px] dx-input-surface'>
          <Icon.Icon icon={icon} classNames='mx-2' />
          <div className='grow text-sm truncate'>{debug ? shape.type : (name ?? shape.text ?? title)}</div>
          {nodeId && (
            <Button.Root
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
            <Button.Root
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
