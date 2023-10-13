//
// Copyright 2023 DXOS.org
//

import { Root as PortalRoot } from '@radix-ui/react-portal';
import { Button as ToolbarButtonItem } from '@radix-ui/react-toolbar';
import React, {
  type ComponentProps,
  type ReactNode,
  useState,
  forwardRef,
  type ForwardRefExoticComponent,
  type FC,
} from 'react';

import {
  useId,
  Tooltip as NaturalTooltip,
  type TooltipRootProps,
  type TooltipContentProps,
  type TooltipTriggerProps,
} from '@dxos/aurora';

export const TooltipContent: ForwardRefExoticComponent<TooltipContentProps> = forwardRef<
  HTMLDivElement,
  TooltipContentProps
>(({ children, ...props }, forwardedRef) => {
  return (
    <NaturalTooltip.Portal>
      <NaturalTooltip.Content forceMount {...props} ref={forwardedRef}>
        <NaturalTooltip.Arrow />
        {children}
      </NaturalTooltip.Content>
    </NaturalTooltip.Portal>
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
  slots = {},
}: TooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const labelId = useId('tooltipLabel');

  const tooltipContent = (
    <TooltipContent
      forceMount
      {...slots.content}
      side={side ?? slots.content?.side ?? 'top'}
      classNames={[zIndex, !compact && 'px-4 py-2.5', !isOpen && 'sr-only', slots.content?.classNames]}
    >
      {content}
    </TooltipContent>
  );

  const triggerContent = (
    <NaturalTooltip.Trigger asChild {...(tooltipLabelsTrigger && { 'aria-labelledby': labelId })}>
      {children}
    </NaturalTooltip.Trigger>
  );

  return (
    <NaturalTooltip.Root open={isOpen} onOpenChange={setIsOpen}>
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
        <NaturalTooltip.Portal forceMount {...(zIndex && { className: `!${zIndex}` })}>
          {tooltipContent}
        </NaturalTooltip.Portal>
      )}
    </NaturalTooltip.Root>
  );
};

export const TooltipRoot: FC<TooltipRootProps> = NaturalTooltip.Root;

export const TooltipTrigger: ForwardRefExoticComponent<TooltipTriggerProps> = NaturalTooltip.Trigger;
