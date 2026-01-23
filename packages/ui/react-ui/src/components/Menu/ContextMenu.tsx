//
// Copyright 2023 DXOS.org
//
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useElevationContext, useThemeContext } from '../../hooks';
import { useSafeCollisionPadding } from '../../hooks/useSafeCollisionPadding';
import { type ThemedClassName } from '../../util';

type ContextMenuRootProps = ContextMenuPrimitive.ContextMenuProps;

const ContextMenuRoot = ContextMenuPrimitive.ContextMenu;

type ContextMenuTriggerProps = ContextMenuPrimitive.ContextMenuTriggerProps;

const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

type ContextMenuPortalProps = ContextMenuPrimitive.ContextMenuPortalProps;

const ContextMenuPortal = ContextMenuPrimitive.Portal;

type ContextMenuContentProps = ThemedClassName<ContextMenuPrimitive.ContextMenuContentProps> & {
  constrainBlockSize?: boolean;
};

const ContextMenuContent = forwardRef<HTMLDivElement, ContextMenuContentProps>(
  ({ classNames, children, collisionPadding = 8, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const elevation = useElevationContext();
    const safeCollisionPadding = useSafeCollisionPadding(collisionPadding);
    return (
      <ContextMenuPrimitive.Content
        {...props}
        data-arrow-keys='up down'
        collisionPadding={safeCollisionPadding}
        className={tx('menu.content', 'menu', { elevation }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </ContextMenuPrimitive.Content>
    );
  },
);

type ContextMenuViewportProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  asChild?: boolean;
};

const ContextMenuViewport = forwardRef<HTMLDivElement, ContextMenuViewportProps>(
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

type ContextMenuArrowProps = ThemedClassName<ContextMenuPrimitive.ContextMenuArrowProps>;

const ContextMenuArrow = forwardRef<SVGSVGElement, ContextMenuArrowProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <ContextMenuPrimitive.Arrow
      {...props}
      className={tx('menu.arrow', 'menu__arrow', {}, classNames)}
      ref={forwardedRef}
    />
  );
});

type ContextMenuGroupProps = ContextMenuPrimitive.ContextMenuGroupProps;

const ContextMenuGroup = ContextMenuPrimitive.Group;

type ContextMenuItemIndicatorProps = ContextMenuPrimitive.ContextMenuItemIndicatorProps;

const ContextMenuItemIndicator = ContextMenuPrimitive.ItemIndicator;

type ContextMenuItemProps = ThemedClassName<ContextMenuPrimitive.ContextMenuItemProps>;

const ContextMenuItem = forwardRef<HTMLDivElement, ContextMenuItemProps>(
  ({ classNames, ...props }: ContextMenuItemProps, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ContextMenuPrimitive.Item
        {...props}
        className={tx('menu.item', 'menu__item', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type ContextMenuCheckboxItemProps = ThemedClassName<ContextMenuPrimitive.ContextMenuCheckboxItemProps>;

const ContextMenuCheckboxItem = forwardRef<HTMLDivElement, ContextMenuCheckboxItemProps>(
  ({ classNames, ...props }: ContextMenuItemProps, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ContextMenuPrimitive.CheckboxItem
        {...props}
        className={tx('menu.item', 'menu__item--checkbox', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type ContextMenuSeparatorProps = ThemedClassName<ContextMenuPrimitive.ContextMenuSeparatorProps>;

const ContextMenuSeparator = forwardRef<HTMLDivElement, ContextMenuSeparatorProps>(
  ({ classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ContextMenuPrimitive.Separator
        {...props}
        className={tx('menu.separator', 'menu__item', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type ContextMenuGroupLabelProps = ThemedClassName<ContextMenuPrimitive.ContextMenuLabelProps>;

const ContextMenuGroupLabel = forwardRef<HTMLDivElement, ContextMenuGroupLabelProps>(
  ({ classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ContextMenuPrimitive.Label
        {...props}
        className={tx('menu.groupLabel', 'menu__group__label', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

export const ContextMenu = {
  Root: ContextMenuRoot,
  Trigger: ContextMenuTrigger,
  Portal: ContextMenuPortal,
  Content: ContextMenuContent,
  Viewport: ContextMenuViewport,
  Arrow: ContextMenuArrow,
  Group: ContextMenuGroup,
  Item: ContextMenuItem,
  CheckboxItem: ContextMenuCheckboxItem,
  ItemIndicator: ContextMenuItemIndicator,
  Separator: ContextMenuSeparator,
  GroupLabel: ContextMenuGroupLabel,
};

export type {
  ContextMenuRootProps,
  ContextMenuTriggerProps,
  ContextMenuPortalProps,
  ContextMenuContentProps,
  ContextMenuViewportProps,
  ContextMenuArrowProps,
  ContextMenuGroupProps,
  ContextMenuItemProps,
  ContextMenuCheckboxItemProps,
  ContextMenuItemIndicatorProps,
  ContextMenuSeparatorProps,
  ContextMenuGroupLabelProps,
};
