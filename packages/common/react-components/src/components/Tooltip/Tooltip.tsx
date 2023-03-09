//
// Copyright 2022 DXOS.org
//

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { TooltipContentProps, TooltipTriggerProps, TooltipProps } from '@radix-ui/react-tooltip';
import React, { forwardRef } from 'react';

import { defaultTooltip } from '../../styles';
import { mx } from '../../util';

type TooltipRootProps = TooltipProps;

const TooltipRoot = TooltipPrimitive.Root;

const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ children, className, ...props }, forwardedRef) => {
    return (
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          forceMount
          {...props}
          className={mx(
            'inline-flex items-center rounded-md plb-2 pli-3',
            'shadow-lg bg-white dark:bg-neutral-800',
            defaultTooltip,
            className
          )}
          ref={forwardedRef}
        >
          <TooltipPrimitive.Arrow className='fill-white dark:fill-neutral-800' />
          {children}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    );
  }
);

const TooltipTrigger = TooltipPrimitive.Trigger;

export { TooltipRoot, TooltipContent, TooltipTrigger };

export type { TooltipContentProps, TooltipTriggerProps, TooltipRootProps };
