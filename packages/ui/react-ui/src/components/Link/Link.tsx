//
// Copyright 2022 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

export type LinkProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.a>> &
  Partial<{
    asChild: boolean;
    variant: 'accent' | 'neutral';
  }>;

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ asChild, variant, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.a;
    return <Root {...props} className={tx('link.root', 'link', { variant }, classNames)} ref={forwardedRef} />;
  },
);
