//
// Copyright 2023 DXOS.org
//

import { Root as PortalRoot } from '@radix-ui/react-portal';
import { Button as ToolbarButtonItem } from '@radix-ui/react-toolbar';
import { Portal as TooltipPortal } from '@radix-ui/react-tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type {
  TooltipContentProps,
  TooltipTriggerProps,
  TooltipProps as RadixTooltipProps
} from '@radix-ui/react-tooltip';
import React, { ComponentProps, ReactNode, useState, forwardRef } from 'react';

import { useId } from '@dxos/aurora';
import { defaultTooltip, mx } from '@dxos/aurora-theme';

type TooltipRootProps = RadixTooltipProps;

export const TooltipRoot = TooltipPrimitive.Root;

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
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

export const TooltipTrigger = TooltipPrimitive.Trigger;

export type { TooltipContentProps, TooltipTriggerProps, TooltipRootProps };

type TooltipSlots = {
  content?: Omit<ComponentProps<typeof TooltipContent>, 'children'>;
};

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: ComponentProps<typeof TooltipContent>['side'];
  compact?: boolean;
  tooltipLabelsTrigger?: boolean;
  mountAsSibling?: boolean;
  triggerIsInToolbar?: boolean;
  zIndex?: string;
  slots?: TooltipSlots;
};

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
    <TooltipContent
      forceMount
      {...slots.content}
      side={side ?? slots.content?.side ?? 'top'}
      className={mx(zIndex, !compact && 'px-4 py-2.5', !isOpen && 'sr-only', defaultTooltip, slots.content?.className)}
    >
      {content}
    </TooltipContent>
  );

  const triggerContent = (
    <TooltipTrigger asChild {...(tooltipLabelsTrigger && { 'aria-labelledby': labelId })}>
      {children}
    </TooltipTrigger>
  );

  return (
    <TooltipRoot open={isOpen} onOpenChange={setIsOpen}>
      {triggerIsInToolbar ? <ToolbarButtonItem asChild>{triggerContent}</ToolbarButtonItem> : triggerContent}
      {tooltipLabelsTrigger && (
        <PortalRoot asChild>
          <span id={labelId} className='sr-only'>
            {content}
          </span>
        </PortalRoot>
      )}
      {mountAsSibling ? (
        tooltipContent
      ) : (
        <TooltipPortal forceMount {...(zIndex && { className: `!${zIndex}` })}>
          {tooltipContent}
        </TooltipPortal>
      )}
    </TooltipRoot>
  );
};
