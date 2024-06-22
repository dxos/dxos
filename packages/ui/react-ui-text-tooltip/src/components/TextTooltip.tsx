//
// Copyright 2024 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, { type CSSProperties, forwardRef, Fragment, type PropsWithChildren, useRef, useState } from 'react';

import { Tooltip, type TooltipContentProps } from '@dxos/react-ui';

export type TextTooltipProps = PropsWithChildren<
  {
    text: string;
    asChild?: boolean;
    portal?: boolean;
    zIndex?: CSSProperties['zIndex'];
    onlyWhenTruncating?: boolean;
  } & Pick<TooltipContentProps, 'side' | 'sideOffset'>
>;

export const TextTooltip = forwardRef<HTMLButtonElement, TextTooltipProps>(
  (
    { text, children, onlyWhenTruncating, asChild = true, portal = true, zIndex = 70, sideOffset, side },
    forwardedRef,
  ) => {
    const ContentRoot = portal ? Tooltip.Portal : Fragment;
    const content = useRef<HTMLButtonElement | null>(null);
    const ref = useComposedRefs(content, forwardedRef);
    const [open, setOpen] = useState(false);
    return (
      <Tooltip.Root
        open={open}
        onOpenChange={(nextOpen) => {
          if (onlyWhenTruncating && nextOpen && content.current) {
            return setOpen(content.current.scrollWidth > content.current.offsetWidth);
          } else {
            return setOpen(nextOpen);
          }
        }}
      >
        <Tooltip.Trigger asChild={asChild} ref={ref}>
          {children}
        </Tooltip.Trigger>
        <ContentRoot>
          <Tooltip.Content
            {...{
              side,
              sideOffset,
              style: { zIndex },
            }}
          >
            {text}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </ContentRoot>
      </Tooltip.Root>
    );
  },
);
