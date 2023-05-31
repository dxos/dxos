//
// Copyright 2023 DXOS.org
//
import {
  Root as DropdownMenuRootPrimitive,
  DropdownMenuProps as DropdownMenuRootPrimitiveProps,
  DropdownMenuTrigger as DropdownMenuTriggerPrimitive,
  DropdownMenuTriggerProps as DropdownMenuTriggerPrimitiveProps,
  DropdownMenuPortal as DropdownMenuPortalPrimitive,
  DropdownMenuPortalProps as DropdownMenuPortalPrimitiveProps,
  DropdownMenuContent as DropdownMenuContentPrimitive,
  DropdownMenuContentProps as DropdownMenuContentPrimitiveProps,
  DropdownMenuArrow as DropdownMenuArrowPrimitive,
  DropdownMenuArrowProps as DropdownMenuArrowPrimitiveProps,
  DropdownMenuGroup as DropdownMenuGroupPrimitive,
  DropdownMenuGroupProps as DropdownMenuGroupPrimitiveProps,
  DropdownMenuItem as DropdownMenuItemPrimitive,
  DropdownMenuItemProps as DropdownMenuItemPrimitiveProps,
  DropdownMenuSeparator as DropdownMenuSeparatorPrimitive,
  DropdownMenuSeparatorProps as DropdownMenuSeparatorPrimitiveProps,
  DropdownMenuLabel as DropdownMenuLabelPrimitive,
  DropdownMenuLabelProps as DropdownMenuLabelPrimitiveProps,
} from '@radix-ui/react-dropdown-menu';
import React, { forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { ElevationProvider } from '../ElevationProvider';

type DropdownMenuRootProps = DropdownMenuRootPrimitiveProps;

const DropdownMenuRoot = DropdownMenuRootPrimitive;

type DropdownMenuTriggerProps = DropdownMenuTriggerPrimitiveProps;

const DropdownMenuTrigger = DropdownMenuTriggerPrimitive;

type DropdownMenuPortalProps = DropdownMenuPortalPrimitiveProps;

const DropdownMenuPortal = DropdownMenuPortalPrimitive;

type DropdownMenuContentProps = ThemedClassName<DropdownMenuContentPrimitiveProps>;

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

export {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuArrow,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuGroupLabel,
};

export type {
  DropdownMenuRootProps,
  DropdownMenuTriggerProps,
  DropdownMenuPortalProps,
  DropdownMenuContentProps,
  DropdownMenuArrowProps,
  DropdownMenuGroupProps,
  DropdownMenuItemProps,
  DropdownMenuSeparatorProps,
  DropdownMenuGroupLabelProps,
};
