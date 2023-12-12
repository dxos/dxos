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

export const AnchoredOverflow = {
  Root: AnchoredOverflowRoot,
  Anchor: AnchoredOverflowAnchor,
};

export type { AnchoredOverflowRootProps, AnchoredOverflowAnchorProps };
