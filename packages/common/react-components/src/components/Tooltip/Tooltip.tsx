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
      <TooltipPrimitive.Content
        forceMount
        {...props}
        className={mx(
          'radix-side-top:animate-slide-down-fade',
          'radix-side-right:animate-slide-left-fade',
          'radix-side-bottom:animate-slide-up-fade',
          'radix-side-left:animate-slide-right-fade',
          'inline-flex items-center rounded-md',
          'shadow-lg bg-white dark:bg-neutral-800',
          defaultTooltip,
          className
        )}
        ref={forwardedRef}
      >
        <TooltipPrimitive.Arrow className='fill-current' />
        {children}
      </TooltipPrimitive.Content>
    );
  }
);

const TooltipTrigger = TooltipPrimitive.Trigger;

export { TooltipRoot, TooltipContent, TooltipTrigger };

export type { TooltipContentProps, TooltipTriggerProps, TooltipRootProps };
