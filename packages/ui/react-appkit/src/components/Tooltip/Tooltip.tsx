//
// Copyright 2023 DXOS.org
//

import { Root as PortalRoot } from '@radix-ui/react-portal';
import { Button as ToolbarButtonItem } from '@radix-ui/react-toolbar';
import React, { ComponentProps, ReactNode, useState, forwardRef, ForwardRefExoticComponent } from 'react';

import {
  useId,
  TooltipRootProps,
  TooltipRoot,
  TooltipContentProps,
  TooltipPortal,
  TooltipContent as AuroraTooltipContent,
  TooltipArrow,
  TooltipTriggerProps,
  TooltipTrigger
} from '@dxos/aurora';

export const TooltipContent: ForwardRefExoticComponent<TooltipContentProps> = forwardRef<
  HTMLDivElement,
  TooltipContentProps
>(({ children, ...props }, forwardedRef) => {
  return (
    <TooltipPortal>
      <AuroraTooltipContent forceMount {...props} ref={forwardedRef}>
        <TooltipArrow />
        {children}
      </AuroraTooltipContent>
    </TooltipPortal>
  );
});

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

/**
 * @deprecated please use Tooltip from @dxos/aurora directly.
 */
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
      className={[zIndex, !compact && 'px-4 py-2.5', !isOpen && 'sr-only', slots.content?.className]}
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

export { TooltipRoot, TooltipTrigger };
