//
// Copyright 2025 DXOS.org
//

import React, { Fragment, useCallback } from 'react';

import { Icon, Toolbar as NaturalToolbar, type ToolbarRootProps, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { mx, textBlockWidth, toolbarLayout } from '@dxos/react-ui-theme';

import { actionLabel, ActionLabel } from './ActionLabel';
import { DropdownMenu } from './DropdownMenu';
import { type MenuScopedProps, useMenu, useMenuItems } from './MenuContext';
import { translationKey } from '../translations';
import {
  type MenuAction,
  type MenuItem,
  isMenuGroup,
  isSeparator,
  type MenuItemGroup,
  type MenuActionProperties,
  type MenuMultipleSelectActionGroup,
  type MenuSingleSelectActionGroup,
} from '../types';

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

export type ToolbarMenuProps = ToolbarRootProps & { textBlockWidth?: boolean };

export type ToolbarMenuActionGroupProps = {
  group: MenuItemGroup<ToolbarMenuActionGroupProperties>;
  items?: MenuItem[];
};

export type ToolbarMenuActionProps = {
  group: MenuItemGroup<ToolbarMenuActionGroupProperties>;
  action: MenuAction;
};

const ActionToolbarItem = ({ action, __menuScope }: MenuScopedProps<{ action: MenuAction }>) => {
  const { iconSize } = useMenu('ActionToolbarItem', __menuScope);
  const { t } = useTranslation(translationKey);
  const handleClick = useCallback(() => action.data?.(), [action]);
  const { icon, iconOnly = true, disabled, testId, hidden, classNames } = action.properties;
  const Root = icon ? NaturalToolbar.IconButton : NaturalToolbar.Button;
  const rootProps = icon
    ? { icon, size: iconSize, iconOnly, label: actionLabel(action, t) }
    : { children: <ActionLabel action={action} /> };
  return hidden ? null : (
    <Root
      key={action.id}
      disabled={disabled}
      onClick={handleClick}
      variant='ghost'
      {...(testId && { 'data-testid': testId })}
      {...(rootProps as any)}
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
  const { t } = useTranslation(translationKey);
  const { iconSize } = useMenu('DropdownMenuToolbarItem', __menuScope);
  const items = useMenuItems(group, propsItems, 'DropdownMenuToolbarItem', __menuScope);
  const activeItem = items?.find((item) => !!(item as MenuAction).properties.checked);
  const icon =
    ((group.properties as any).applyActive &&
      // TODO(thure): Handle other menu item types.
      (activeItem as MenuAction)?.properties.icon) ||
    group.properties.icon;
  const Root = icon ? NaturalToolbar.IconButton : NaturalToolbar.Button;
  const labelAction = (group.properties as any).applyActive && activeItem ? (activeItem as MenuAction) : group;
  const rootProps = icon
    ? { icon, size: iconSize, iconOnly, label: actionLabel(labelAction, t), caretDown: true }
    : {
        children: (
          <>
            <ActionLabel action={labelAction} />
            <Icon size={3} icon='ph--caret-down--bold' classNames='mis-1' />
          </>
        ),
      };
  return (
    <DropdownMenu.Root group={group} items={items}>
      <DropdownMenu.Trigger asChild>
        <Root variant='ghost' disabled={disabled} {...(rootProps as any)} {...(testId && { 'data-testid': testId })} />
      </DropdownMenu.Trigger>
    </DropdownMenu.Root>
  );
};

const ToggleGroupItem = ({ group, action, __menuScope }: MenuScopedProps<ToolbarMenuActionProps>) => {
  const { iconSize } = useMenu('ToggleGroupItem', __menuScope);
  const { t } = useTranslation(translationKey);
  const { icon, iconOnly = true, disabled, testId, hidden, classNames } = action.properties;
  const handleClick = useCallback(() => action.data?.({ parent: group }), [action, group]);
  const Root = icon ? NaturalToolbar.ToggleGroupIconItem : NaturalToolbar.ToggleGroupItem;
  const rootProps = icon
    ? { icon, size: iconSize, iconOnly, label: actionLabel(action, t) }
    : { children: <ActionLabel action={action} /> };
  return hidden ? null : (
    <Root
      key={action.id}
      value={action.id as any}
      disabled={disabled}
      onClick={handleClick}
      variant='ghost'
      {...(testId && { 'data-testid': testId })}
      {...(rootProps as any)}
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
          <ToggleGroupItem key={action.id} group={group} action={action} />
        ))
      }
    </NaturalToolbar.ToggleGroup>
  );
};

export const ToolbarMenu = ({
  __menuScope,
  classNames,
  textBlockWidth: wrapContents,
  ...props
}: MenuScopedProps<ToolbarMenuProps>) => {
  const items = useMenuItems(undefined, undefined, 'ToolbarMenu', __menuScope);
  const { attendableId } = useMenu('ToolbarMenu', __menuScope);
  const { hasAttention } = useAttention(attendableId);
  const InnerRoot = wrapContents ? 'div' : Fragment;
  const innerRootProps = wrapContents ? { role: 'none', className: mx(textBlockWidth, toolbarLayout) } : {};
  return (
    <NaturalToolbar.Root
      {...props}
      layoutManaged={wrapContents}
      classNames={[attendableId && !hasAttention && '*:opacity-20 !bg-transparent', classNames]}
    >
      <InnerRoot {...innerRootProps}>
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
      </InnerRoot>
    </NaturalToolbar.Root>
  );
};
