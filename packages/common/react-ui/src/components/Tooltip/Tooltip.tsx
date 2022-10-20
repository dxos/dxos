//
// Copyright 2022 DXOS.org
//

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import cx from 'classnames';
import React, { ReactNode, useState } from 'react';

import { defaultTooltip } from '../../styles';

export interface TooltipProps {
  trigger: ReactNode
  children: ReactNode
}

export const Tooltip = ({ trigger, children }: TooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
      <TooltipPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <TooltipPrimitive.Trigger asChild>
          {trigger}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Content
          className={cx(
            'radix-side-top:animate-slide-down-fade',
            'radix-side-right:animate-slide-left-fade',
            'radix-side-bottom:animate-slide-up-fade',
            'radix-side-left:animate-slide-right-fade',
            'inline-flex items-center rounded-md px-4 py-2.5',
            'shadow-lg bg-white dark:bg-neutral-800',
            !isOpen && 'sr-only',
            defaultTooltip
          )}
        >
          <TooltipPrimitive.Arrow
            className='fill-current text-white dark:text-neutral-800' />
          {children}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Root>
  );
};
