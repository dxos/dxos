//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import {
  Input,
  Toolbar as NaturalToolbar,
  type ToolbarRootProps,
  Tooltip,
  toLocalizedString,
  useTranslation,
} from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { mx } from '@dxos/ui-theme';
import { type DropdownMenuItemGroupProperties, type ToggleGroupMenuItemGroupProperties } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { type MenuAction, type MenuItem, type MenuItemGroup, isMenuGroup, isSeparator } from '../types';
import { executeMenuAction } from '../util';
import { actionLabel } from './action-label';
import { ActionLabel } from './ActionLabel';
import { DropdownMenu } from './DropdownMenu';
import { useMenuItems, useMenuScoped } from './MenuContext';

export type ToolbarMenuDropdownMenuActionGroup = DropdownMenuItemGroupProperties;

export type ToolbarMenuToggleGroupActionGroup = ToggleGroupMenuItemGroupProperties;

export type ToolbarMenuActionGroupProperties = DropdownMenuItemGroupProperties | ToggleGroupMenuItemGroupProperties;

export type ToolbarMenuProps = ToolbarRootProps;

export type ToolbarMenuActionGroupProps = {
  group: MenuItemGroup<ToolbarMenuActionGroupProperties>;
  items?: MenuItem[];
};

export type ToolbarMenuDropdownGroupProps = {
  group: MenuItemGroup<DropdownMenuItemGroupProperties>;
  items?: MenuItem[];
};

export type ToolbarMenuToggleGroupProps = {
  group: MenuItemGroup<ToggleGroupMenuItemGroupProperties>;
  items?: MenuItem[];
};

export type ToolbarMenuActionProps = {
  group: MenuItemGroup<ToggleGroupMenuItemGroupProperties>;
  action: MenuAction;
};

const ActionToolbarItem = ({ action }: { action: MenuAction }) => {
  const { iconSize, onAction } = useMenuScoped('ActionToolbarItem');
  const { t } = useTranslation(translationKey);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  const { icon, iconOnly = true, disabled, testId, hidden, classNames, iconClassNames, spin } = action.properties;
  const buttonVariant = action.properties.variant === 'primary' ? ('primary' as const) : ('ghost' as const);

  const handleClick = useCallback(() => {
    if (pendingRef.current) {
      return;
    }
    pendingRef.current = true;
    setPending(true);
    const done = () => {
      pendingRef.current = false;
      setPending(false);
    };
    if (onAction) {
      Promise.resolve(onAction(action, {})).then(done, done);
    } else {
      executeMenuAction(action).then(done, done);
    }
  }, [action, onAction]);

  const commonProps = {
    variant: buttonVariant,
    disabled: disabled || pending,
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
      iconClassNames={mx(spin && 'animate-spin', iconClassNames)}
      label={actionLabel(action, t)}
    />
  ) : (
    <NaturalToolbar.Button key={action.id} {...commonProps}>
      <ActionLabel action={action} />
    </NaturalToolbar.Button>
  );
};

const SwitchToolbarItem = ({ action }: { action: MenuAction }) => {
  const { onAction } = useMenuScoped('SwitchToolbarItem');
  const { t } = useTranslation(translationKey);
  const { label, iconOnly, disabled, testId, hidden, checked } = action.properties;
  const labelStr = toLocalizedString(label, t);

  const handleCheckedChange = useCallback(() => {
    if (onAction) {
      onAction(action, {});
    } else {
      void executeMenuAction(action);
    }
  }, [action, onAction]);

  if (hidden) {
    return null;
  }

  const switchInput = (
    <Input.Switch
      checked={checked}
      disabled={disabled}
      aria-label={iconOnly ? labelStr : undefined}
      onCheckedChange={handleCheckedChange}
      {...(testId && { 'data-testid': testId })}
    />
  );

  return (
    <Input.Root>
      {iconOnly ? (
        <Tooltip.Trigger asChild content={labelStr}>
          <Input.Block>{switchInput}</Input.Block>
        </Tooltip.Trigger>
      ) : (
        <Input.Block>{switchInput}</Input.Block>
      )}
      {!iconOnly && <Input.Label>{labelStr}</Input.Label>}
    </Input.Root>
  );
};

const DropdownMenuToolbarItem = ({ group, items: propsItems }: ToolbarMenuDropdownGroupProps) => {
  const { t } = useTranslation(translationKey);
  const { iconSize } = useMenuScoped('DropdownMenuToolbarItem');
  const items = useMenuItems(group, propsItems, 'DropdownMenuToolbarItem');
  const {
    iconOnly,
    disabled,
    testId,
    applyActive,
    caretDown = true,
    icon: groupIcon,
    iconClassNames: groupIconClassNames,
    spin: groupSpin,
  } = group.properties;
  const activeItem = items?.find((item) => !!(item as MenuAction).properties.checked) as MenuAction | undefined;
  const icon =
    (applyActive &&
      // TODO(thure): Handle other menu item types.
      activeItem?.properties.icon) ||
    groupIcon;
  // Follow the same `applyActive` rule for `iconClassNames` so a per-item accent (e.g. tag colour) tracks the displayed icon.
  const iconClassNames = (applyActive && activeItem?.properties.iconClassNames) || groupIconClassNames;
  const spin = (applyActive && activeItem?.properties.spin) || groupSpin;
  const labelAction = applyActive && activeItem ? activeItem : group;

  const trigger = icon ? (
    <NaturalToolbar.IconButton
      variant='ghost'
      disabled={disabled}
      icon={icon}
      size={iconSize}
      iconOnly={iconOnly}
      iconClassNames={mx(spin && 'animate-spin', iconClassNames)}
      label={actionLabel(labelAction, t)}
      caretDown={caretDown && !disabled}
      {...(testId && { 'data-testid': testId })}
    />
  ) : (
    <NaturalToolbar.Button
      variant='ghost'
      disabled={disabled}
      caretDown={caretDown && !disabled}
      {...(testId && { 'data-testid': testId })}
    >
      <ActionLabel action={labelAction} />
    </NaturalToolbar.Button>
  );

  // No menu behind a disabled trigger, since `disabled` alone does not gate the machine's open handler and the
  // group presented an empty dropdown.
  if (disabled) {
    return trigger;
  }

  return (
    <DropdownMenu.Root group={group} items={items}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
    </DropdownMenu.Root>
  );
};

const ToggleGroupItem = ({ group, action }: ToolbarMenuActionProps) => {
  const { iconSize, onAction } = useMenuScoped('ToggleGroupItem');
  const { t } = useTranslation(translationKey);
  const { icon, iconOnly = true, disabled, testId, hidden, classNames, iconClassNames, spin } = action.properties;

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
      iconClassNames={mx(spin && 'animate-spin', iconClassNames)}
      label={actionLabel(action, t)}
    />
  ) : (
    <NaturalToolbar.ToggleGroupItem {...commonProps}>
      <ActionLabel action={action} />
    </NaturalToolbar.ToggleGroupItem>
  );
};

const ToggleGroupToolbarItem = ({ group, items: itemsProp }: ToolbarMenuToggleGroupProps) => {
  const items = useMenuItems(group, itemsProp, 'ToggleGroupToolbarItem');
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

/**
 * Attention-gated toolbar container with no graph items of its own — render {@link ToolbarMenuItems}
 * among its children, whose JSX order controls where the graph items sit.
 */
export const ToolbarMenu = composable<HTMLDivElement, ToolbarMenuProps>(({ children, ...props }, forwardedRef) => {
  const { attendableId, alwaysActive } = useMenuScoped('ToolbarMenu');
  const { hasAttention } = useAttention(attendableId);

  return (
    <NaturalToolbar.Root
      {...composableProps(props, { classNames: attendableId })}
      disabled={!alwaysActive && !hasAttention}
      ref={forwardedRef}
    >
      {children}
    </NaturalToolbar.Root>
  );
});

/** The menu graph's toolbar items, container-free, so JSX order controls their placement. */
export const ToolbarMenuItems = () => {
  const items = useMenuItems(undefined, undefined, 'ToolbarMenuItems');

  return (
    <>
      {items?.map((item: MenuItem) => (
        <ToolbarMenuItem key={item.id} item={item} />
      ))}
    </>
  );
};

const ToolbarMenuItem = ({ item }: { item: MenuItem }) => {
  if (isSeparator(item)) {
    return <NaturalToolbar.Separator variant={item.properties.variant} />;
  }

  if (isMenuGroup(item)) {
    if (item.properties.variant === 'dropdownMenu') {
      return <DropdownMenuToolbarItem group={item as MenuItemGroup<DropdownMenuItemGroupProperties>} />;
    }

    return <ToggleGroupToolbarItem group={item as MenuItemGroup<ToggleGroupMenuItemGroupProperties>} />;
  }

  const action = item as MenuAction;
  if (action.properties?.variant === 'switch') {
    return <SwitchToolbarItem action={action} />;
  }

  // The contributor owns the rendered element (interactions the action model cannot express).
  if (action.properties?.variant === 'custom' && action.properties.render) {
    return <>{action.properties.render()}</>;
  }

  return <ActionToolbarItem action={action} />;
};
