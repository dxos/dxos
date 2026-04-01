//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Icon, Toolbar as NaturalToolbar, type ToolbarRootProps, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { composable, composableProps } from '@dxos/ui-theme';
import { type MenuActionProperties } from '@dxos/ui-types';

import { translationKey } from '../translations';
import {
  type MenuAction,
  type MenuItem,
  type MenuItemGroup,
  type MenuMultipleSelectActionGroup,
  type MenuSingleSelectActionGroup,
  isMenuGroup,
  isSeparator,
} from '../types';
import { executeMenuAction } from '../util';

import { ActionLabel, actionLabel } from './ActionLabel';
import { DropdownMenu } from './DropdownMenu';
import { type MenuScopedProps, useMenuItems, useMenuScoped } from './Menu';

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

export type ToolbarMenuActionProps = {
  group: MenuItemGroup<ToolbarMenuActionGroupProperties>;
  action: MenuAction;
};

const ActionToolbarItem = ({ __menuScope, action }: MenuScopedProps<{ action: MenuAction }>) => {
  const { iconSize, onAction } = useMenuScoped('ActionToolbarItem', __menuScope);
  const { t } = useTranslation(translationKey);

  const { icon, iconOnly = true, disabled, testId, hidden, classNames } = action.properties;
  const buttonVariant =
    (action.properties as { variant?: string }).variant === 'primary' ? ('primary' as const) : ('ghost' as const);

  const handleClick = useCallback(() => {
    if (onAction) {
      onAction(action, {});
    } else {
      void executeMenuAction(action);
    }
  }, [action, onAction]);

  const commonProps = {
    variant: buttonVariant,
    disabled,
    classNames,
    onClick: handleClick,
    ...(testId && { 'data-testid': testId }),
  };

  if (hidden) {
    return null;
  }

  return icon ? (
    <NaturalToolbar.IconButton
      key={action.id}
      {...commonProps}
      icon={icon}
      size={iconSize}
      iconOnly={iconOnly}
      label={actionLabel(action, t)}
    />
  ) : (
    <NaturalToolbar.Button key={action.id} {...commonProps}>
      <ActionLabel action={action} />
    </NaturalToolbar.Button>
  );
};

const DropdownMenuToolbarItem = ({
  __menuScope,
  group,
  items: propsItems,
}: MenuScopedProps<ToolbarMenuActionGroupProps>) => {
  const { iconOnly, disabled, testId } = group.properties;
  const { t } = useTranslation(translationKey);
  const { iconSize } = useMenuScoped('DropdownMenuToolbarItem', __menuScope);
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
    ? {
        icon,
        size: iconSize,
        iconOnly,
        label: actionLabel(labelAction, t),
        caretDown: true,
      }
    : {
        children: (
          <>
            <ActionLabel action={labelAction} />
            <Icon size={3} icon='ph--caret-down--bold' classNames='ms-1' />
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

const ToggleGroupItem = ({ __menuScope, group, action }: MenuScopedProps<ToolbarMenuActionProps>) => {
  const { iconSize, onAction } = useMenuScoped('ToggleGroupItem', __menuScope);
  const { t } = useTranslation(translationKey);
  const { icon, iconOnly = true, disabled, testId, hidden, classNames } = action.properties;

  const handleClick = useCallback(() => {
    if (onAction) {
      onAction(action, { parent: group });
    } else {
      void executeMenuAction(action, { parent: group });
    }
  }, [action, group, onAction]);

  const commonProps = {
    value: action.id,
    disabled,
    variant: 'ghost' as const,
    classNames,
    onClick: handleClick,
    ...(testId && { 'data-testid': testId }),
  };

  return hidden ? null : icon ? (
    <NaturalToolbar.ToggleGroupIconItem
      {...commonProps}
      icon={icon}
      size={iconSize}
      iconOnly={iconOnly}
      label={actionLabel(action, t)}
    />
  ) : (
    <NaturalToolbar.ToggleGroupItem {...commonProps}>
      <ActionLabel action={action} />
    </NaturalToolbar.ToggleGroupItem>
  );
};

const ToggleGroupToolbarItem = ({
  __menuScope,
  group,
  items: itemsProp,
}: MenuScopedProps<ToolbarMenuActionGroupProps>) => {
  const items = useMenuItems(group, itemsProp, 'ToggleGroupToolbarItem', __menuScope);
  const { selectCardinality } = group.properties;

  // TODO(thure): Handle other menu item types.
  const children = (items as MenuAction[]).map((action) => (
    <ToggleGroupItem key={action.id} group={group} action={action} />
  ));

  if (selectCardinality === 'multiple') {
    return (
      <NaturalToolbar.ToggleGroup type='multiple' value={group.properties.value}>
        {children}
      </NaturalToolbar.ToggleGroup>
    );
  } else {
    return (
      <NaturalToolbar.ToggleGroup type='single' value={group.properties.value}>
        {children}
      </NaturalToolbar.ToggleGroup>
    );
  }
};

export const ToolbarMenu = composable<HTMLDivElement, MenuScopedProps<ToolbarMenuProps>>(
  ({ __menuScope, children, ...props }, forwardedRef) => {
    const items = useMenuItems(undefined, undefined, 'ToolbarMenu', __menuScope);
    const { attendableId, alwaysActive } = useMenuScoped('ToolbarMenu', __menuScope);
    const { hasAttention } = useAttention(attendableId);

    return (
      <NaturalToolbar.Root
        {...composableProps(props, { classNames: attendableId })}
        disabled={!alwaysActive && !hasAttention}
        ref={forwardedRef}
      >
        {items?.map((item: MenuItem) => (
          <ToolbarMenuItem key={item.id} __menuScope={__menuScope} item={item} />
        ))}
        {children}
      </NaturalToolbar.Root>
    );
  },
);

const ToolbarMenuItem = ({ __menuScope, item }: MenuScopedProps<{ item: MenuItem }>) => {
  if (isSeparator(item)) {
    return <NaturalToolbar.Separator variant={item.properties.variant} />;
  }

  if (isMenuGroup(item)) {
    if (item.properties.variant === 'dropdownMenu') {
      return (
        <DropdownMenuToolbarItem
          __menuScope={__menuScope}
          group={item as MenuItemGroup<ToolbarMenuActionGroupProperties>}
        />
      );
    } else {
      return (
        <ToggleGroupToolbarItem
          __menuScope={__menuScope}
          group={item as MenuItemGroup<ToolbarMenuActionGroupProperties>}
        />
      );
    }
  }

  return <ActionToolbarItem __menuScope={__menuScope} action={item as MenuAction} />;
};
