//
// Copyright 2022 DXOS.org
//

// @import-as-namespace

import { ark } from '@ark-ui/react/factory';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks/index.ts';
import { type ThemedClassName } from '../../util/index.ts';

type LinkProps = ThemedClassName<ComponentPropsWithRef<typeof ark.a>> &
  Partial<{
    asChild: boolean;
    variant: 'accent' | 'neutral';
  }>;

const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ classNames, asChild, variant, target = '_blank', rel = 'noreferrer', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ark.a
        asChild={asChild}
        {...props}
        target={target}
        rel={rel}
        className={tx('link.root', { variant }, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

export { Link as Root };
export type { LinkProps as RootProps };
export * from './Link.theme.ts';
