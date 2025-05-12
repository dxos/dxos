//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { Icon, type IconButtonProps, Toolbar as NaturalToolbar, type ToolbarRootProps } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';

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
  applyActive?: boolean;
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
  const { icon, iconOnly = true, disabled, testId, hidden, classNames } = action.properties;
  const Root = icon ? NaturalToolbar.IconButton : NaturalToolbar.Button;
  const rootProps = icon
    ? { icon, size: iconSize, iconOnly, label: <ActionLabel action={action} /> }
    : { children: <ActionLabel action={action} /> };
  return hidden ? null : (
    <Root
      key={action.id}
      disabled={disabled}
      onClick={handleClick}
      variant='ghost'
      {...(testId && { 'data-testid': testId })}
      {...(rootProps as IconButtonProps)}
      classNames={classNames}
    />
  );
};

const DropdownMenuToolbarItem = ({
  group,
  items: propsItems,
  __menuScope,
}: MenuScopedProps<ToolbarMenuActionGroupProps>) => {
  const { iconOnly, disabled, testId } = group.properties;
  const suppressNextTooltip = useRef(false);
  const { iconSize } = useMenu('DropdownMenuToolbarItem', __menuScope);
  const items = useMenuItems(group, propsItems, 'DropdownMenuToolbarItem', __menuScope);
  const activeItem = items?.find((item) => !!(item as MenuAction).properties.checked);
  const icon =
    ((group.properties as any).applyActive &&
      // TODO(thure): Handle other menu item types.
      (activeItem as MenuAction)?.properties.icon) ||
    group.properties.icon;
  const Root = icon ? NaturalToolbar.IconButton : NaturalToolbar.Button;
  const label = (
    <ActionLabel action={(group.properties as any).applyActive && activeItem ? (activeItem as MenuAction) : group} />
  );
  const rootProps = icon
    ? { icon, size: iconSize, iconOnly, label, caretDown: true, suppressNextTooltip }
    : {
        children: (
          <>
            {label}
            <Icon size={3} icon='ph--caret-down--bold' classNames='mis-1' />
          </>
        ),
      };
  return (
    <DropdownMenu.Root group={group} items={items} suppressNextTooltip={suppressNextTooltip}>
      <DropdownMenu.Trigger asChild>
        <Root
          variant='ghost'
          disabled={disabled}
          {...(rootProps as IconButtonProps)}
          {...(testId && { 'data-testid': testId })}
        />
      </DropdownMenu.Trigger>
    </DropdownMenu.Root>
  );
};

const ToggleGroupItem = ({ action, __menuScope }: MenuScopedProps<{ action: MenuAction }>) => {
  const { iconSize, onAction } = useMenu('ToggleGroupItem', __menuScope);
  const { icon, iconOnly = true, disabled, testId, hidden, classNames } = action.properties;
  const handleClick = useCallback(() => {
    onAction?.(action);
  }, [action, onAction]);
  const Root = icon ? NaturalToolbar.ToggleGroupIconItem : NaturalToolbar.ToggleGroupItem;
  const rootProps = icon
    ? { icon, size: iconSize, iconOnly, label: <ActionLabel action={action} /> }
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
      classNames={classNames}
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

export const ToolbarMenu = ({ __menuScope, classNames, ...props }: MenuScopedProps<ToolbarMenuProps>) => {
  const items = useMenuItems(undefined, undefined, 'ToolbarMenu', __menuScope);
  const { attendableId } = useMenu('ToolbarMenu', __menuScope);
  const { hasAttention } = useAttention(attendableId);
  return (
    <NaturalToolbar.Root
      {...props}
      classNames={['p-0 pointer-fine:p-1 attention-surface', !hasAttention && 'opacity-20', classNames]}
    >
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
