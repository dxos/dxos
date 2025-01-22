//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { type IconButtonProps, Toolbar as NaturalToolbar, type ToolbarRootProps } from '@dxos/react-ui';

import { ActionLabel } from './ActionLabel';
import { DropdownMenu } from './DropdownMenu';
import { type MenuScopedProps, useMenu, useMenuItems } from './MenuContext';
import {
  type MenuAction,
  type MenuItem,
  isMenuGroup,
  isSeparator,
  type MenuItemGroup,
  type MenuActionProperties,
  type MenuMultipleSelectActionGroup,
  type MenuSingleSelectActionGroup,
} from '../defs';

export type ToolbarMenuDropdownMenuActionGroup = Omit<MenuActionProperties, 'variant' | 'icon'> & {
  variant: 'dropdownMenu';
  icon: string;
  applyActiveIcon?: boolean;
};

export type ToolbarMenuToggleGroupActionGroup = Omit<MenuActionProperties, 'variant'> & {
  variant: 'toggleGroup';
};

export type ToolbarMenuActionGroupProperties = (
  | ToolbarMenuDropdownMenuActionGroup
  | ToolbarMenuToggleGroupActionGroup
) &
  (MenuSingleSelectActionGroup | MenuMultipleSelectActionGroup);

export type ToolbarMenuProps = ToolbarRootProps;

export type ToolbarMenuActionGroupProps = {
  group: MenuItemGroup<ToolbarMenuActionGroupProperties>;
  items?: MenuItem[];
};

const ActionToolbarItem = ({ action, __menuScope }: MenuScopedProps<{ action: MenuAction }>) => {
  const { onAction, iconSize } = useMenu('ActionToolbarItem', __menuScope);
  const handleClick = useCallback(() => {
    onAction?.(action);
  }, [action, onAction]);
  const { icon, iconOnly = true, disabled, testId, hidden } = action.properties;
  const Root = icon ? NaturalToolbar.IconButton : NaturalToolbar.Button;
  const rootProps = icon
    ? { icon, iconSize, iconOnly, label: <ActionLabel action={action} /> }
    : { children: <ActionLabel action={action} /> };
  return hidden ? null : (
    <Root
      key={action.id}
      disabled={disabled}
      onClick={handleClick}
      variant='ghost'
      {...(testId && { 'data-testid': testId })}
      {...(rootProps as IconButtonProps)}
    />
  );
};

const DropdownMenuToolbarItem = ({
  group,
  items: propsItems,
  __menuScope,
}: MenuScopedProps<ToolbarMenuActionGroupProps>) => {
  const { iconOnly = true, disabled, testId } = group.properties;
  const suppressNextTooltip = useRef(false);
  const { iconSize } = useMenu('DropdownMenuToolbarItem', __menuScope);
  const items = useMenuItems(group, propsItems, 'DropdownMenuToolbarItem', __menuScope);
  const icon =
    ((group.properties as any).applyActiveIcon &&
      // TODO(thure): Handle other menu item types.
      (items as MenuAction[])?.find((item) => !!item.properties.checked)?.properties.icon) ||
    group.properties.icon;
  return (
    <DropdownMenu.Root group={group} items={items} suppressNextTooltip={suppressNextTooltip}>
      <DropdownMenu.Trigger asChild>
        <NaturalToolbar.IconButton
          variant='ghost'
          caretDown
          iconOnly={iconOnly}
          disabled={disabled}
          icon={icon}
          size={iconSize}
          label={<ActionLabel action={group} />}
          {...(testId && { 'data-testid': testId })}
          suppressNextTooltip={suppressNextTooltip}
        />
      </DropdownMenu.Trigger>
    </DropdownMenu.Root>
  );
};

const ToggleGroupItem = ({ action, __menuScope }: MenuScopedProps<{ action: MenuAction }>) => {
  const { iconSize, onAction } = useMenu('ToggleGroupItem', __menuScope);
  const { icon, iconOnly = true, disabled, testId, hidden } = action.properties;
  const handleClick = useCallback(() => {
    onAction?.(action);
  }, [action, onAction]);
  const Root = icon ? NaturalToolbar.ToggleGroupIconItem : NaturalToolbar.ToggleGroupItem;
  const rootProps = icon
    ? { icon, iconSize, iconOnly, label: <ActionLabel action={action} /> }
    : { children: <ActionLabel action={action} /> };
  return hidden ? null : (
    <Root
      key={action.id}
      value={action.id as any}
      disabled={disabled}
      onClick={handleClick}
      variant='ghost'
      {...(testId && { 'data-testid': testId })}
      {...(rootProps as IconButtonProps)}
    />
  );
};

const ToggleGroupToolbarItem = ({
  group,
  items: propsItems,
  __menuScope,
}: MenuScopedProps<ToolbarMenuActionGroupProps>) => {
  const items = useMenuItems(group, propsItems, 'ToggleGroupToolbarItem', __menuScope);
  const { selectCardinality, value } = group.properties;
  return (
    // TODO(thure): The type here is difficult to manage, what do?
    // @ts-ignore
    <NaturalToolbar.ToggleGroup type={selectCardinality} value={value}>
      {
        // TODO(thure): Handle other menu item types.
        (items as MenuAction[]).map((action) => (
          <ToggleGroupItem key={action.id} action={action} />
        ))
      }
    </NaturalToolbar.ToggleGroup>
  );
};

export const ToolbarMenu = ({ __menuScope, ...props }: MenuScopedProps<ToolbarMenuProps>) => {
  const items = useMenuItems(undefined, undefined, 'ToolbarMenu', __menuScope);
  return (
    <NaturalToolbar.Root {...props}>
      {items?.map((item: MenuItem, i: number) =>
        isSeparator(item) ? (
          <NaturalToolbar.Separator key={i} variant={item.properties.variant} />
        ) : isMenuGroup(item) ? (
          item.properties.variant === 'dropdownMenu' ? (
            // TODO(thure): Figure out type narrowing that doesn’t require so much use of `as`.
            <DropdownMenuToolbarItem key={item.id} group={item as MenuItemGroup<ToolbarMenuActionGroupProperties>} />
          ) : (
            // TODO(thure): Figure out type narrowing that doesn’t require so much use of `as`.
            <ToggleGroupToolbarItem key={item.id} group={item as MenuItemGroup<ToolbarMenuActionGroupProperties>} />
          )
        ) : (
          // TODO(thure): Figure out type narrowing that doesn’t require so much use of `as`.
          <ActionToolbarItem key={item.id} action={item as MenuAction} />
        ),
      )}
    </NaturalToolbar.Root>
  );
};
