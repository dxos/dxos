//
// Copyright 2022 DXOS.org
//

import { Button as ToolbarButtonItem } from '@radix-ui/react-toolbar';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import React, { ComponentProps, ReactNode, useState } from 'react';

import { useId } from '../../hooks';
import { defaultTooltip } from '../../styles';
import { mx } from '../../util';

export interface TooltipSlots {
  content?: Omit<ComponentProps<typeof TooltipPrimitive.Content>, 'children'>;
  arrow?: Pick<ComponentProps<typeof TooltipPrimitive.Arrow>, 'className'>;
}

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: TooltipPrimitive.TooltipContentProps['side'];
  compact?: boolean;
  tooltipLabelsTrigger?: boolean;
  mountAsSibling?: boolean;
  triggerIsInToolbar?: boolean;
  zIndex?: string;
  slots?: TooltipSlots;
}

export const Tooltip = ({
  content,
  children,
  side,
  compact,
  tooltipLabelsTrigger,
  mountAsSibling,
  triggerIsInToolbar,
  zIndex = 'z-[2]',
  slots = {}
}: TooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const labelId = useId('tooltipLabel');

  const tooltipContent = (
    <TooltipPrimitive.Content
      forceMount
      {...slots.content}
      side={side ?? slots.content?.side ?? 'top'}
      className={mx(
        'radix-side-top:animate-slide-down-fade',
        'radix-side-right:animate-slide-left-fade',
        'radix-side-bottom:animate-slide-up-fade',
        'radix-side-left:animate-slide-right-fade',
        'inline-flex items-center rounded-md',
        zIndex,
        !compact && 'px-4 py-2.5',
        'shadow-lg bg-white dark:bg-neutral-800',
        !isOpen && 'sr-only',
        defaultTooltip,
        slots.content?.className
      )}
    >
      <TooltipPrimitive.Arrow className={mx('fill-current text-white dark:text-neutral-800', slots.arrow?.className)} />
      {content}
    </TooltipPrimitive.Content>
  );

  const triggerContent = (
    <TooltipPrimitive.Trigger asChild {...(tooltipLabelsTrigger && { 'aria-labelledby': labelId })}>
      {children}
    </TooltipPrimitive.Trigger>
  );

  return (
    <TooltipPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      {triggerIsInToolbar ? <ToolbarButtonItem asChild>{triggerContent}</ToolbarButtonItem> : triggerContent}
      {tooltipLabelsTrigger && (
        <span id={labelId} className='sr-only'>
          {content}
        </span>
      )}
      {mountAsSibling ? tooltipContent : <TooltipPrimitive.Portal forceMount>{tooltipContent}</TooltipPrimitive.Portal>}
    </TooltipPrimitive.Root>
  );
};
