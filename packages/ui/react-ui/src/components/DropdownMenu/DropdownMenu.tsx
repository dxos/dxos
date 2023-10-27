//
// Copyright 2023 DXOS.org
//
import {
  Root as DropdownMenuRootPrimitive,
  type DropdownMenuProps as DropdownMenuRootPrimitiveProps,
  DropdownMenuTrigger as DropdownMenuTriggerPrimitive,
  type DropdownMenuTriggerProps as DropdownMenuTriggerPrimitiveProps,
  DropdownMenuPortal as DropdownMenuPortalPrimitive,
  type DropdownMenuPortalProps as DropdownMenuPortalPrimitiveProps,
  DropdownMenuContent as DropdownMenuContentPrimitive,
  type DropdownMenuContentProps as DropdownMenuContentPrimitiveProps,
  DropdownMenuArrow as DropdownMenuArrowPrimitive,
  type DropdownMenuArrowProps as DropdownMenuArrowPrimitiveProps,
  DropdownMenuGroup as DropdownMenuGroupPrimitive,
  type DropdownMenuGroupProps as DropdownMenuGroupPrimitiveProps,
  DropdownMenuItem as DropdownMenuItemPrimitive,
  type DropdownMenuItemProps as DropdownMenuItemPrimitiveProps,
  DropdownMenuSeparator as DropdownMenuSeparatorPrimitive,
  type DropdownMenuSeparatorProps as DropdownMenuSeparatorPrimitiveProps,
  DropdownMenuLabel as DropdownMenuLabelPrimitive,
  type DropdownMenuLabelProps as DropdownMenuLabelPrimitiveProps,
} from '@radix-ui/react-dropdown-menu';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { ElevationProvider } from '../ElevationProvider';

type DropdownMenuRootProps = DropdownMenuRootPrimitiveProps;

const DropdownMenuRoot = DropdownMenuRootPrimitive;

type DropdownMenuTriggerProps = DropdownMenuTriggerPrimitiveProps;

const DropdownMenuTrigger = DropdownMenuTriggerPrimitive;

type DropdownMenuPortalProps = DropdownMenuPortalPrimitiveProps;

const DropdownMenuPortal = DropdownMenuPortalPrimitive;

type DropdownMenuContentProps = ThemedClassName<DropdownMenuContentPrimitiveProps> & { constrainBlockSize?: boolean };

const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DropdownMenuContentPrimitive
        sideOffset={4}
        collisionPadding={8}
        {...props}
        className={tx('dropdownMenu.content', 'dropdown-menu', {}, classNames)}
        ref={forwardedRef}
      >
        <ElevationProvider elevation='chrome'>{children}</ElevationProvider>
      </DropdownMenuContentPrimitive>
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
      <Root
        {...props}
        className={tx('dropdownMenu.viewport', 'dropdown-menu__viewport', {}, classNames)}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

type DropdownMenuArrowProps = ThemedClassName<DropdownMenuArrowPrimitiveProps>;

const DropdownMenuArrow = forwardRef<SVGSVGElement, DropdownMenuArrowProps>(
  ({ classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DropdownMenuArrowPrimitive
        {...props}
        className={tx('dropdownMenu.arrow', 'dropdown-menu__arrow', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type DropdownMenuGroupProps = DropdownMenuGroupPrimitiveProps;

const DropdownMenuGroup = DropdownMenuGroupPrimitive;

type DropdownMenuItemProps = ThemedClassName<DropdownMenuItemPrimitiveProps>;

const DropdownMenuItem = forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ classNames, ...props }: DropdownMenuItemProps, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DropdownMenuItemPrimitive
        {...props}
        className={tx('dropdownMenu.item', 'dropdown-menu__item', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type DropdownMenuSeparatorProps = ThemedClassName<DropdownMenuSeparatorPrimitiveProps>;

const DropdownMenuSeparator = forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  ({ classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DropdownMenuSeparatorPrimitive
        {...props}
        className={tx('dropdownMenu.separator', 'dropdown-menu__item', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type DropdownMenuGroupLabelProps = ThemedClassName<DropdownMenuLabelPrimitiveProps>;

const DropdownMenuGroupLabel = forwardRef<HTMLDivElement, DropdownMenuGroupLabelProps>(
  ({ classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DropdownMenuLabelPrimitive
        {...props}
        className={tx('dropdownMenu.groupLabel', 'dropdown-menu__group__label', {}, classNames)}
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
  Separator: DropdownMenuSeparator,
  GroupLabel: DropdownMenuGroupLabel,
};

export type {
  DropdownMenuRootProps,
  DropdownMenuTriggerProps,
  DropdownMenuPortalProps,
  DropdownMenuContentProps,
  DropdownMenuViewportProps,
  DropdownMenuArrowProps,
  DropdownMenuGroupProps,
  DropdownMenuItemProps,
  DropdownMenuSeparatorProps,
  DropdownMenuGroupLabelProps,
};
