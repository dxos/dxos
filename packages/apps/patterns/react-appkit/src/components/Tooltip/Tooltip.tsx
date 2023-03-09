//
// Copyright 2023 DXOS.org
//

import { Root as PortalRoot } from '@radix-ui/react-portal';
import { Button as ToolbarButtonItem } from '@radix-ui/react-toolbar';
import { Portal as TooltipPortal } from '@radix-ui/react-tooltip';
import React, { ComponentProps, ReactNode, useState } from 'react';

import { TooltipContent, TooltipTrigger, TooltipRoot, defaultTooltip, mx, useId } from '@dxos/react-components';

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
