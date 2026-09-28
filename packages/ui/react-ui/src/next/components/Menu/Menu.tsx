//
// Copyright 2026 DXOS.org
//

import { Menu as MenuPrimitive } from '@ark-ui/react/menu';
import { Portal } from '@ark-ui/react/portal';
import React, { forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Icon } from '../Icon/index.ts';

/** Gap between trigger and popup, in px (positioning takes a number, not a CSS variable). */
const POPUP_GUTTER = 2;

//
// Root
//

type MenuRootProps = MenuPrimitive.RootProps;

/** Ark menu; content mounts on open and unmounts on close unless the caller opts out. */
const MenuRoot = ({ lazyMount = true, unmountOnExit = true, positioning, ...props }: MenuRootProps) => (
  <MenuPrimitive.Root
    {...props}
    lazyMount={lazyMount}
    unmountOnExit={unmountOnExit}
    // Ark's 8px default reads as detached from the trigger.
    positioning={{ gutter: POPUP_GUTTER, ...positioning }}
  />
);

MenuRoot.displayName = 'Next.Menu.Root';

//
// Trigger
//

type MenuTriggerProps = MenuPrimitive.TriggerProps;

/** Use `asChild` to open the menu from a `Next.Button`. */
const MenuTrigger = forwardRef<HTMLButtonElement, MenuTriggerProps>((props, forwardedRef) => (
  <MenuPrimitive.Trigger {...props} ref={forwardedRef} />
));

MenuTrigger.displayName = 'Next.Menu.Trigger';

//
// Content
//

type MenuContentProps = ThemedClassName<MenuPrimitive.ContentProps> & {
  /** Portalled content leaves the trigger's sized scope, so it takes its own size. */
  size?: Size;
};

/** Portalled menu at `level='popup'`. */
const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(
  ({ classNames, size = 'md', children, ...props }, forwardedRef) => (
    <Portal>
      <MenuPrimitive.Positioner>
        <MenuPrimitive.Content
          {...props}
          data-surface='popup'
          data-size={size}
          className={mx(recipes.popup(), recipes.menuContent(), classNames)}
          ref={forwardedRef}
        >
          {children}
        </MenuPrimitive.Content>
      </MenuPrimitive.Positioner>
    </Portal>
  ),
);

MenuContent.displayName = 'Next.Menu.Content';

//
// Item
//

type MenuItemProps = ThemedClassName<MenuPrimitive.ItemProps> & {
  /** Leading icon. */
  icon?: string;
  /** Trailing keyboard hint, e.g. `⌘C`; display only. */
  shortcut?: string;
};

/** A block-tall row: optional leading Icon, the label, and an optional trailing shortcut. */
const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  ({ classNames, icon, shortcut, children, ...props }, forwardedRef) => (
    <MenuPrimitive.Item {...props} className={mx(recipes.menuItem(), classNames)} ref={forwardedRef}>
      {icon && <Icon icon={icon} />}
      <MenuPrimitive.ItemText className={recipes.menuItemText()}>{children}</MenuPrimitive.ItemText>
      {shortcut && (
        <kbd aria-hidden className={recipes.menuShortcut()}>
          {shortcut}
        </kbd>
      )}
    </MenuPrimitive.Item>
  ),
);

MenuItem.displayName = 'Next.Menu.Item';

//
// Separator
//

type MenuSeparatorProps = ThemedClassName<MenuPrimitive.SeparatorProps>;

const MenuSeparator = forwardRef<HTMLHRElement, MenuSeparatorProps>(({ classNames, ...props }, forwardedRef) => (
  <MenuPrimitive.Separator {...props} className={mx(recipes.menuSeparator(), classNames)} ref={forwardedRef} />
));

MenuSeparator.displayName = 'Next.Menu.Separator';

//
// ItemGroup
//

type MenuItemGroupProps = ThemedClassName<MenuPrimitive.ItemGroupProps>;

const MenuItemGroup = forwardRef<HTMLDivElement, MenuItemGroupProps>(({ classNames, ...props }, forwardedRef) => (
  <MenuPrimitive.ItemGroup {...props} className={mx(classNames)} ref={forwardedRef} />
));

MenuItemGroup.displayName = 'Next.Menu.ItemGroup';

//
// ItemGroupLabel
//

type MenuItemGroupLabelProps = ThemedClassName<MenuPrimitive.ItemGroupLabelProps>;

/** A small caption naming the group that follows. */
const MenuItemGroupLabel = forwardRef<HTMLDivElement, MenuItemGroupLabelProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <MenuPrimitive.ItemGroupLabel {...props} className={mx(recipes.menuGroupLabel(), classNames)} ref={forwardedRef} />
  ),
);

MenuItemGroupLabel.displayName = 'Next.Menu.ItemGroupLabel';

export const Menu = {
  Root: MenuRoot,
  Trigger: MenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  Separator: MenuSeparator,
  ItemGroup: MenuItemGroup,
  ItemGroupLabel: MenuItemGroupLabel,
};

export type {
  MenuContentProps,
  MenuItemGroupLabelProps,
  MenuItemGroupProps,
  MenuItemProps,
  MenuRootProps,
  MenuSeparatorProps,
  MenuTriggerProps,
};
