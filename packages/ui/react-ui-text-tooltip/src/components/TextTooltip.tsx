//
// Copyright 2024 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, {
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
  type SyntheticEvent,
  forwardRef,
  useCallback,
  useRef,
} from 'react';

import { Tooltip, type TooltipScopedProps, type TooltipTriggerProps } from '@dxos/react-ui';

export type TextTooltipProps = PropsWithChildren<
  {
    text: string;
    asChild?: boolean;
    onlyWhenTruncating?: boolean;
    truncateQuery?: string;
  } & Pick<TooltipTriggerProps, 'side'> &
    ComponentPropsWithoutRef<'button'>
>;

export const TextTooltip = forwardRef<HTMLButtonElement, TooltipScopedProps<TextTooltipProps>>(
  (
    { __scopeTooltip, text, children, onlyWhenTruncating, asChild = true, side, truncateQuery, ...props },
    forwardedRef,
  ) => {
    const content = useRef<HTMLButtonElement | null>(null);
    const ref = useComposedRefs(content, forwardedRef);
    const handleInteract = useCallback(
      (event: SyntheticEvent) => {
        if (onlyWhenTruncating && content.current) {
          const element: HTMLElement | null = truncateQuery
            ? content.current.querySelector(truncateQuery)
            : content.current;
          if (!element || element.scrollWidth <= element.offsetWidth) {
            event.preventDefault();
          }
        }
      },
      [onlyWhenTruncating, truncateQuery],
    );
    return (
      <Tooltip.Trigger asChild={asChild} {...props} content={text} side={side} onInteract={handleInteract} ref={ref}>
        {children}
      </Tooltip.Trigger>
    );
  },
);
