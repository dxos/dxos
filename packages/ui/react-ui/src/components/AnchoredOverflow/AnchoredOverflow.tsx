//
// Copyright 2022 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type AnchoredOverflowRootProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  asChild?: boolean;
};

const AnchoredOverflowRoot = forwardRef<HTMLDivElement, AnchoredOverflowRootProps>(
  ({ asChild, classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root
        role='none'
        {...props}
        className={tx('anchoredOverflow.root', 'overflow-anchored', {}, classNames)}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

type AnchoredOverflowAnchorProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  asChild?: boolean;
};

const AnchoredOverflowAnchor = forwardRef<HTMLDivElement, AnchoredOverflowAnchorProps>(
  ({ asChild, classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root
        role='none'
        {...props}
        className={tx('anchoredOverflow.anchor', 'overflow-anchor', {}, classNames)}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

/**
 * This component leverages the CSS https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor property to prevent unwanted scroll jumps when content is dynamically
 * added above the viewport. This is particularly useful for:
 * - Chat applications where new messages are prepended to the list.
 * - Notification feeds where new items appear at the top.
 * - Any scenario where content is inserted at the start of a scrollable container.
 */
// TODO(burdon): Move into container?
export const AnchoredOverflow = {
  Root: AnchoredOverflowRoot,
  Anchor: AnchoredOverflowAnchor,
};

export type { AnchoredOverflowRootProps, AnchoredOverflowAnchorProps };
