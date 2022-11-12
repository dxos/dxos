//
// Copyright 2022 DXOS.org
//

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import cx from 'classnames';
import React, { ComponentProps, ReactNode, useState } from 'react';

import { useId } from '../../hooks';
import { defaultTooltip } from '../../styles';

export interface TooltipProps extends Omit<ComponentProps<typeof TooltipPrimitive.Content>, 'children'> {
  content: ReactNode;
  children: ReactNode;
  compact?: boolean;
  tooltipLabelsTrigger?: boolean;
  mountAsSibling?: boolean;
}

export const Tooltip = ({
  content,
  children,
  compact,
  tooltipLabelsTrigger,
  mountAsSibling,
  ...contentProps
}: TooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const labelId = useId('tooltipLabel');

  const tooltipContent = (
    <TooltipPrimitive.Content
      forceMount
      {...contentProps}
      className={cx(
        'radix-side-top:animate-slide-down-fade',
        'radix-side-right:animate-slide-left-fade',
        'radix-side-bottom:animate-slide-up-fade',
        'radix-side-left:animate-slide-right-fade',
        'inline-flex items-center rounded-md',
        !compact && 'px-4 py-2.5',
        'shadow-lg bg-white dark:bg-neutral-800',
        !isOpen && 'sr-only',
        defaultTooltip,
        contentProps.className
      )}
    >
      <TooltipPrimitive.Arrow className='fill-current text-white dark:text-neutral-800' />
      {content}
    </TooltipPrimitive.Content>
  );

  return (
    <TooltipPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <TooltipPrimitive.Trigger asChild {...(tooltipLabelsTrigger && { 'aria-labelledby': labelId })}>
        {children}
      </TooltipPrimitive.Trigger>
      {tooltipLabelsTrigger && (
        <span id={labelId} className='sr-only'>
          {content}
        </span>
      )}
      {mountAsSibling ? tooltipContent : <TooltipPrimitive.Portal forceMount>{tooltipContent}</TooltipPrimitive.Portal>}
    </TooltipPrimitive.Root>
  );
};
