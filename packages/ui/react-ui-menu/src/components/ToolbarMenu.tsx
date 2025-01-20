//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';
import { type ToolbarRootProps } from '@dxos/react-ui';

import { ActionLabel } from './ActionLabel';
import { DropdownMenu } from './DropdownMenu';
import { useMenu, useMenuItems } from './MenuContext';
import {
  type MenuAction,
  type MenuItem,
  isMenuGroup,
  isSeparator,
  type MenuItemGroup,
  type MenuActionProperties,
  type MenuActionGroupMultipleSelect,
  type MenuActionGroupSingleSelect,
} from '../defs';

export type ToolbarActionGroupDropdownMenu = Omit<MenuActionProperties, 'variant' | 'icon'> & {
  variant: 'dropdownMenu';
  icon: string;
  applyActiveIcon?: boolean;
};

export type ToolbarActionGroupToggleGroup = Omit<MenuActionProperties, 'variant'> & {
  variant: 'toggleGroup';
};

export type ToolbarActionGroupProperties = (ToolbarActionGroupDropdownMenu | ToolbarActionGroupToggleGroup) &
  (MenuActionGroupSingleSelect | MenuActionGroupMultipleSelect);

export type ToolbarMenuProps = ToolbarRootProps;

export type ToolbarActionGroupProps = {
  group: MenuItemGroup<ToolbarActionGroupProperties>;
  items?: MenuItem[];
};

const ToolbarItemAction = ({ action }: { action: MenuAction }) => {
  const { onAction, iconSize } = useMenu();
  const handleClick = useCallback(() => {
    onAction?.(action);
  }, [action, onAction]);
  const { icon, iconOnly = true, disabled, testId } = action.properties;
  return (
    <NaturalToolbar.IconButton
      key={action.id}
      iconOnly={iconOnly}
      icon={icon}
      size={iconSize}
      label={<ActionLabel action={action} />}
      disabled={disabled}
      onClick={handleClick}
      variant='ghost'
      {...(testId && { 'data-testid': testId })}
    />
  );
};

const ToolbarItemDropdownMenu = ({ group, items: propsItems }: ToolbarActionGroupProps) => {
  const { iconOnly = true, disabled, testId } = group.properties;
  const suppressNextTooltip = useRef(false);
  const { iconSize } = useMenu();
  const items = useMenuItems(group, propsItems);
  const icon =
    ((group.properties as any).applyActiveIcon &&
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

const ToggleGroupItem = ({ action }: { action: MenuAction }) => {
  const { iconSize, onAction } = useMenu();
  const { icon, iconOnly = true, disabled } = action.properties;
  const handleClick = useCallback(() => {
    onAction?.(action);
  }, [action, onAction]);
  return (
    <NaturalToolbar.ToggleGroupIconItem
      key={action.id}
      value={action.id}
      icon={icon}
      size={iconSize}
      iconOnly={iconOnly}
      disabled={disabled}
      label={<ActionLabel action={action} />}
      onClick={handleClick}
      variant='ghost'
    />
  );
};

const ToolbarItemToggleGroup = ({ group, items: propsItems }: ToolbarActionGroupProps) => {
  const items = useMenuItems(group, propsItems);
  const { selectCardinality, value } = group.properties;
  return (
    // TODO(thure): The type here is difficult to manage, what do?
    // @ts-ignore
    <NaturalToolbar.ToggleGroup type={selectCardinality} value={value}>
      {(items as MenuAction[]).map((action) => (
        <ToggleGroupItem key={action.id} action={action} />
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

export const ToolbarMenu = ({ ...props }: ToolbarMenuProps) => {
  const items = useMenuItems();
  return (
    <NaturalToolbar.Root {...props}>
      {items?.map((item: MenuItem, i: number) =>
        isSeparator(item) ? (
          <NaturalToolbar.Separator key={i} variant={item.properties.variant} />
        ) : isMenuGroup(item) ? (
          item.properties.variant === 'dropdownMenu' ? (
            <ToolbarItemDropdownMenu key={item.id} group={item as MenuItemGroup<ToolbarActionGroupProperties>} />
          ) : (
            <ToolbarItemToggleGroup key={item.id} group={item as MenuItemGroup<ToolbarActionGroupProperties>} />
          )
        ) : (
          <ToolbarItemAction key={item.id} action={item as MenuAction} />
        ),
      )}
    </NaturalToolbar.Root>
  );
};
