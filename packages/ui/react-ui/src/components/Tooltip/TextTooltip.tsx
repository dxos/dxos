//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import React, { type ComponentPropsWithoutRef, type PropsWithChildren, forwardRef, useCallback, useRef } from 'react';

import { useComposedRefs } from '@dxos/react-hooks';

import * as Tooltip from './Tooltip.tsx';
type TextTooltipProps = PropsWithChildren<
  {
    text: string;
    asChild?: boolean;
    onlyWhenTruncating?: boolean;
    truncateQuery?: string;
  } & Pick<Tooltip.TriggerProps, 'side'> &
    ComponentPropsWithoutRef<'button'>
>;

const TextTooltip = forwardRef<HTMLButtonElement, TextTooltipProps>(
  ({ text, children, onlyWhenTruncating, asChild = true, side, truncateQuery, ...props }, forwardedRef) => {
    const content = useRef<HTMLButtonElement | null>(null);
    const ref = useComposedRefs(content, forwardedRef);
    const handleInteract = useCallback(() => {
      if (onlyWhenTruncating && content.current) {
        const element: HTMLElement | null = truncateQuery
          ? content.current.querySelector(truncateQuery)
          : content.current;
        if (!element || element.scrollWidth <= element.offsetWidth) {
          return false;
        }
      }
    }, [onlyWhenTruncating, truncateQuery]);

    return (
      <Tooltip.Trigger asChild={asChild} {...props} content={text} side={side} onInteract={handleInteract} ref={ref}>
        {children}
      </Tooltip.Trigger>
    );
  },
);

export { TextTooltip as Root };
export type { TextTooltipProps as RootProps };
