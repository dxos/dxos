//
// Copyright 2024 DXOS.org
//

import * as Collapsible from '@radix-ui/react-collapsible';
import { type CollapsibleProps } from '@radix-ui/react-collapsible';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type TreeGridRootProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & { asChild?: boolean };

const TreeGridRoot = forwardRef<HTMLDivElement, TreeGridRootProps>(
  ({ asChild, classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root role='treegrid' className={tx('treegrid.root', 'treegrid', {}, classNames)} {...props} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

type TreeGridRowProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  level: number;
  asChild?: boolean;
  collapsible?: boolean;
} & Pick<CollapsibleProps, 'disabled' | 'open' | 'defaultOpen' | 'onOpenChange'>;

const TreeGridRow = forwardRef<HTMLDivElement, TreeGridRowProps>(
  (
    { asChild, classNames, children, level, collapsible, disabled, open, defaultOpen, onOpenChange, ...props },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : collapsible ? Collapsible.Root : Primitive.div;
    return (
      <Root
        role='row'
        aria-level={level}
        className={tx('treegrid.row', 'treegrid__row', { level }, classNames)}
        {...(collapsible && { disabled, open, defaultOpen, onOpenChange })}
        {...props}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

export type { TreeGridRootProps, TreeGridRowProps };

export const TreeGrid = {
  Root: TreeGridRoot,
  Row: TreeGridRow,
};
