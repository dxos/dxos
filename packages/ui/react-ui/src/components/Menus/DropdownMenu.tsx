//
// Copyright 2023 DXOS.org
//
import { type Scope, type ScopeHook } from '@radix-ui/react-context';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { type DropdownMenuContextValue } from '@radix-ui/react-dropdown-menu';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { ElevationProvider } from '../ElevationProvider';

type DropdownMenuRootProps = DropdownMenuPrimitive.DropdownMenuProps;

const DropdownMenuRoot = DropdownMenuPrimitive.DropdownMenu;

type DropdownMenuTriggerProps = DropdownMenuPrimitive.DropdownMenuTriggerProps;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

type DropdownMenuPortalProps = DropdownMenuPrimitive.DropdownMenuPortalProps;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

type DropdownMenuContentProps = ThemedClassName<DropdownMenuPrimitive.DropdownMenuContentProps> & {
  constrainBlockSize?: boolean;
};

// @ts-ignore
const useDropdownMenuContext: (
  consumerName: string,
  scope: Scope<DropdownMenuContextValue | undefined>,
) => DropdownMenuContextValue = DropdownMenuPrimitive.useDropdownMenuContext;
// @ts-ignore
const useDropdownMenuMenuScope: ScopeHook = DropdownMenuPrimitive.useDropdownMenuMenuScope;

const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DropdownMenuPrimitive.Content
        sideOffset={4}
        collisionPadding={8}
        {...props}
        className={tx('menu.content', 'menu', {}, classNames)}
        ref={forwardedRef}
      >
        <ElevationProvider elevation='chrome'>{children}</ElevationProvider>
      </DropdownMenuPrimitive.Content>
    );
  },
);

type DropdownMenuViewportProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  asChild?: boolean;
};

const DropdownMenuViewport = forwardRef<HTMLDivElement, DropdownMenuViewportProps>(
  ({ classNames, asChild, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root {...props} className={tx('menu.viewport', 'menu__viewport', {}, classNames)} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

type DropdownMenuArrowProps = ThemedClassName<DropdownMenuPrimitive.DropdownMenuArrowProps>;

const DropdownMenuArrow = forwardRef<SVGSVGElement, DropdownMenuArrowProps>(
  ({ classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DropdownMenuPrimitive.Arrow
        {...props}
        className={tx('menu.arrow', 'menu__arrow', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type DropdownMenuGroupProps = DropdownMenuPrimitive.DropdownMenuGroupProps;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

type DropdownMenuItemIndicatorProps = DropdownMenuPrimitive.DropdownMenuItemIndicatorProps;

const DropdownMenuItemIndicator = DropdownMenuPrimitive.ItemIndicator;

type DropdownMenuItemProps = ThemedClassName<DropdownMenuPrimitive.DropdownMenuItemProps>;

const DropdownMenuItem = forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ classNames, ...props }: DropdownMenuItemProps, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DropdownMenuPrimitive.Item
        {...props}
        className={tx('menu.item', 'menu__item', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type DropdownMenuCheckboxItemProps = ThemedClassName<DropdownMenuPrimitive.DropdownMenuCheckboxItemProps>;

const DropdownMenuCheckboxItem = forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({ classNames, ...props }: DropdownMenuItemProps, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DropdownMenuPrimitive.CheckboxItem
        {...props}
        className={tx('menu.item', 'menu__item--checkbox', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type DropdownMenuSeparatorProps = ThemedClassName<DropdownMenuPrimitive.DropdownMenuSeparatorProps>;

const DropdownMenuSeparator = forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  ({ classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DropdownMenuPrimitive.Separator
        {...props}
        className={tx('menu.separator', 'menu__item', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type DropdownMenuGroupLabelProps = ThemedClassName<DropdownMenuPrimitive.DropdownMenuLabelProps>;

const DropdownMenuGroupLabel = forwardRef<HTMLDivElement, DropdownMenuGroupLabelProps>(
  ({ classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DropdownMenuPrimitive.Label
        {...props}
        className={tx('menu.groupLabel', 'menu__group__label', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

export const DropdownMenu = {
  Root: DropdownMenuRoot,
  Trigger: DropdownMenuTrigger,
  Portal: DropdownMenuPortal,
  Content: DropdownMenuContent,
  Viewport: DropdownMenuViewport,
  Arrow: DropdownMenuArrow,
  Group: DropdownMenuGroup,
  Item: DropdownMenuItem,
  CheckboxItem: DropdownMenuCheckboxItem,
  ItemIndicator: DropdownMenuItemIndicator,
  Separator: DropdownMenuSeparator,
  GroupLabel: DropdownMenuGroupLabel,
};

export { useDropdownMenuContext, useDropdownMenuMenuScope };

export type {
  DropdownMenuRootProps,
  DropdownMenuTriggerProps,
  DropdownMenuPortalProps,
  DropdownMenuContentProps,
  DropdownMenuViewportProps,
  DropdownMenuArrowProps,
  DropdownMenuGroupProps,
  DropdownMenuItemProps,
  DropdownMenuCheckboxItemProps,
  DropdownMenuItemIndicatorProps,
  DropdownMenuSeparatorProps,
  DropdownMenuGroupLabelProps,
};
