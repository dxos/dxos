//
// Copyright 2026 DXOS.org
//

import React, { type ButtonHTMLAttributes, forwardRef, useCallback, useMemo, useRef, useState } from 'react';

import { useAttention } from '@dxos/react-ui-attention';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Switch from '@dxos/react-ui/Switch';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';
import * as Toggle from '@dxos/react-ui/Toggle';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import * as Util from '@dxos/react-ui/Util';
import {
  type ClassNameValue,
  type DropdownMenuItemGroupProperties,
  type ToggleGroupMenuItemGroupProperties,
} from '@dxos/ui-types';

import { translationKey } from '#translations';

import { useMenuActions, useMenuItems } from '../hooks/index.ts';
import {
  type MenuAction,
  type MenuActions,
  type MenuItem,
  type MenuItemGroup,
  isMenuGroup,
  isSeparator,
} from '../types.ts';
import { executeMenuAction } from '../util.ts';
import { actionLabel } from './action-label.ts';
import { ActionLabel } from './ActionLabel.tsx';
import { ActionMenu } from './ActionMenu.tsx';

//
// Items (private): the graph's root items as `Toolbar` parts.
//

type ItemProps<T> = { menu: MenuActions } & T;

type ActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'title'> & {
  action: MenuAction | MenuItemGroup<DropdownMenuItemGroupProperties>;
  variant: Button.ButtonVariant;
  iconSize?: Util.Size;
  caretDown?: boolean;
  classNames?: ClassNameValue;
  testId?: string;
};

/**
 * An action as a Next Button: icon-only with its label (and shortcut) in a tooltip, or text with a trailing shortcut.
 * Forwards its ref and remaining props, since a `Menu.Trigger asChild` merges the trigger's onto it.
 */
const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ action, classNames, testId, ...props }, forwardedRef) => {
    const { t } = Hooks.useTranslation(translationKey);
    const { icon, iconOnly = true, spin } = action.properties;
    const common = {
      ...props,
      spin,
      classNames,
      ...(testId && { 'data-testid': testId }),
      ref: forwardedRef,
    };
    return icon && iconOnly ? (
      <Button.Button {...common} icon={icon} label={actionLabel(action, t)} iconOnly />
    ) : (
      <Button.Button {...common} icon={icon}>
        <ActionLabel action={action} />
      </Button.Button>
    );
  },
);

const ActionToolbarItem = ({ menu, action }: ItemProps<{ action: MenuAction }>) => {
  const { onAction, caller, iconSize } = menu;
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const { disabled, testId, hidden, classNames } = action.properties;

  // One invocation at a time: the button is disabled until the last one settles.
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
      Promise.resolve(onAction(action, { caller })).then(done, done);
    } else {
      executeMenuAction(action, { caller }).then(done, done);
    }
  }, [action, caller, onAction]);

  if (hidden) {
    return null;
  }

  return (
    <ActionButton
      action={action}
      variant={action.properties.variant === 'primary' ? 'primary' : 'ghost'}
      disabled={disabled || pending}
      iconSize={iconSize}
      classNames={classNames}
      onClick={handleClick}
      testId={testId}
    />
  );
};

/** A `toggle` action is a pressed button whose state is the action's `checked`. */
const ToggleToolbarItem = ({ menu, action }: ItemProps<{ action: MenuAction }>) => {
  const { onAction, caller, iconSize } = menu;
  const { t } = Hooks.useTranslation(translationKey);
  const { icon, iconOnly = true, disabled, testId, hidden, checked, classNames, spin } = action.properties;

  const handlePressedChange = useCallback(() => {
    if (onAction) {
      onAction(action, { caller });
    } else {
      void executeMenuAction(action, { caller });
    }
  }, [action, caller, onAction]);

  if (hidden) {
    return null;
  }

  const common = {
    variant: 'ghost' as const,
    pressed: !!checked,
    disabled,
    spin,
    iconSize: iconSize,
    classNames,
    onPressedChange: handlePressedChange,
    ...(testId && { 'data-testid': testId }),
  };

  return icon && iconOnly ? (
    <Toggle.Toggle {...common} icon={icon} label={actionLabel(action, t)} iconOnly />
  ) : (
    <Toggle.Toggle {...common} icon={icon}>
      <ActionLabel action={action} />
    </Toggle.Toggle>
  );
};

const SwitchToolbarItem = ({ menu, action }: ItemProps<{ action: MenuAction }>) => {
  const { onAction, caller } = menu;
  const { t } = Hooks.useTranslation(translationKey);
  const { label, iconOnly, disabled, testId, hidden, checked } = action.properties;
  const labelStr = ThemeProvider.toLocalizedString(label, t);

  const handleCheckedChange = useCallback(() => {
    if (onAction) {
      onAction(action, { caller });
    } else {
      void executeMenuAction(action, { caller });
    }
  }, [action, caller, onAction]);

  if (hidden) {
    return null;
  }

  const control = (
    <Switch.Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={handleCheckedChange}
      {...(iconOnly ? { 'aria-label': labelStr } : { label: labelStr })}
      {...(testId && { 'data-testid': testId })}
    />
  );

  return iconOnly ? (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{control}</Tooltip.Trigger>
      <Tooltip.Content>{labelStr}</Tooltip.Content>
    </Tooltip.Root>
  ) : (
    control
  );
};

const DropdownToolbarItem = ({ menu, group }: ItemProps<{ group: MenuItemGroup<DropdownMenuItemGroupProperties> }>) => {
  const items = useMenuItems(menu, group);
  const { disabled, testId, applyActive, caretDown = true } = group.properties;
  const activeItem = items?.find((item) => !!(item as MenuAction).properties.checked) as MenuAction | undefined;

  // With `applyActive` the trigger shows the active child's icon, accent and label in place of the group's.
  const display = useMemo<MenuItemGroup<DropdownMenuItemGroupProperties>>(() => {
    if (!applyActive || !activeItem) {
      return group;
    }
    const { icon, iconClassNames, spin, label, keyBinding } = activeItem.properties;
    return {
      ...group,
      properties: {
        ...group.properties,
        icon: icon || group.properties.icon,
        iconClassNames: iconClassNames || group.properties.iconClassNames,
        spin: spin || group.properties.spin,
        label,
        keyBinding,
      },
    };
  }, [group, applyActive, activeItem]);

  const trigger = (
    <ActionButton
      action={display}
      variant='ghost'
      disabled={disabled}
      iconSize={menu.iconSize}
      caretDown={caretDown && !disabled}
      testId={testId}
    />
  );

  // No menu behind a disabled trigger, since `disabled` alone does not gate the machine's open handler.
  if (disabled) {
    return trigger;
  }

  return (
    <ActionMenu {...menu} group={group} actions={items}>
      {trigger}
    </ActionMenu>
  );
};

const ToggleGroupItem = ({
  menu,
  group,
  action,
}: ItemProps<{ group: MenuItemGroup<ToggleGroupMenuItemGroupProperties>; action: MenuAction }>) => {
  const { onAction, caller, iconSize } = menu;
  const { t } = Hooks.useTranslation(translationKey);
  const { icon, iconOnly = true, disabled, testId, hidden, classNames, spin } = action.properties;

  const handleClick = useCallback(() => {
    if (onAction) {
      onAction(action, { parent: group, caller });
    } else {
      void executeMenuAction(action, { parent: group, caller });
    }
  }, [action, group, caller, onAction]);

  if (hidden) {
    return null;
  }

  const common = {
    value: action.id,
    disabled,
    variant: 'ghost' as const,
    spin,
    iconSize: iconSize,
    classNames,
    onClick: handleClick,
    ...(testId && { 'data-testid': testId }),
  };

  return icon && iconOnly ? (
    <ToggleGroup.Item {...common} icon={icon} label={actionLabel(action, t)} iconOnly />
  ) : (
    <ToggleGroup.Item {...common} icon={icon}>
      <ActionLabel action={action} />
    </ToggleGroup.Item>
  );
};

const ToggleGroupToolbarItem = ({
  menu,
  group,
}: ItemProps<{ group: MenuItemGroup<ToggleGroupMenuItemGroupProperties> }>) => {
  const { t } = Hooks.useTranslation(translationKey);
  const items = useMenuItems(menu, group);
  const label = ThemeProvider.toLocalizedString(group.properties.label, t);

  // Only actions render as toggle group items.
  const children = items
    ?.filter((item) => !isSeparator(item) && !isMenuGroup(item))
    .map((item) => <ToggleGroupItem key={item.id} menu={menu} group={group} action={item as MenuAction} />);

  // The group is controlled by the graph: an item's action updates `value`, which flows back in.
  return group.properties.selectCardinality === 'multiple' ? (
    <Toolbar.ToggleGroup type='multiple' value={group.properties.value} aria-label={label}>
      {children}
    </Toolbar.ToggleGroup>
  ) : (
    <Toolbar.ToggleGroup type='single' value={group.properties.value} aria-label={label}>
      {children}
    </Toolbar.ToggleGroup>
  );
};

const ToolbarItem = ({ menu, item }: ItemProps<{ item: MenuItem }>) => {
  if (isSeparator(item)) {
    return <Toolbar.Separator variant={item.properties.variant === 'line' ? 'line' : 'gap'} />;
  }

  if (isMenuGroup(item)) {
    return item.properties.variant === 'dropdownMenu' ? (
      <DropdownToolbarItem menu={menu} group={item as MenuItemGroup<DropdownMenuItemGroupProperties>} />
    ) : (
      <ToggleGroupToolbarItem menu={menu} group={item as MenuItemGroup<ToggleGroupMenuItemGroupProperties>} />
    );
  }

  const action = item as MenuAction;
  switch (action.properties?.variant) {
    case 'switch':
      return <SwitchToolbarItem menu={menu} action={action} />;
    case 'toggle':
      return <ToggleToolbarItem menu={menu} action={action} />;
    case 'custom':
      // The contributor owns the rendered element (interactions the action model cannot express).
      return action.properties.render ? <>{action.properties.render()}</> : null;
    default:
      return <ActionToolbarItem menu={menu} action={action} />;
  }
};

const ActionToolbarItems = ({ menu }: { menu: MenuActions }) => {
  const items = useMenuItems(menu);
  return (
    <>
      {items?.map((item) => (
        <ToolbarItem key={item.id} menu={menu} item={item} />
      ))}
    </>
  );
};

//
// ActionToolbar
//

export type ActionToolbarProps = Partial<MenuActions> &
  Omit<Toolbar.RootProps, 'disabled'> & {
    /** The toolbar is dimmed (still operable) while this attendable lacks attention, unless `alwaysActive`. */
    attendableId?: string;
    alwaysActive?: boolean;
  };

/**
 * A whole `Toolbar.Root` driven from a `MenuActions`: the graph's root items render first, then the toolbar's own
 * children. Mix graph and hand-written controls the other way round by dropping an `ActionMenu` into a plain
 * `Toolbar.Root`. Without a `MenuActions` it is an empty toolbar until one arrives.
 */
export const ActionToolbar = Util.composable<HTMLDivElement, ActionToolbarProps>(
  (
    { items, contributions, onAction, caller, iconSize, attendableId, alwaysActive, children, ...props },
    forwardedRef,
  ) => {
    // Called unconditionally (hooks), used only when no source was spread in.
    const standalone = useMenuActions();
    const menu = useMemo<MenuActions>(
      () => ({
        items: items ?? standalone.items,
        contributions: contributions ?? standalone.contributions,
        onAction,
        caller,
        iconSize,
      }),
      [items, contributions, onAction, caller, iconSize, standalone],
    );
    const { hasAttention } = useAttention(attendableId);

    return (
      <Toolbar.Root
        {...Util.composableProps(props, { classNames: attendableId })}
        inactive={!alwaysActive && !hasAttention}
        ref={forwardedRef}
      >
        <ActionToolbarItems menu={menu} />
        {children}
      </Toolbar.Root>
    );
  },
);

ActionToolbar.displayName = 'ActionToolbar';
